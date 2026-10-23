import type { Metadata } from "next";
import { adminConfigured, isAdmin } from "@/lib/auth";
import { getConfig, listOrders, storageReady } from "@/lib/store";
import AdminDashboard from "@/components/AdminDashboard";
import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin – Aura Hair", robots: { index: false } };

export default async function AdminPage() {
  if (!adminConfigured()) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="font-display text-3xl font-bold text-plum">Admin non configuré</h1>
        <p className="mt-3 text-muted">
          Ajoutez la variable d&apos;environnement <code>ADMIN_PASSWORD</code> dans Vercel (Settings → Environment
          Variables), puis redéployez.
        </p>
      </div>
    );
  }
  if (!(await isAdmin())) return <LoginForm />;
  const [config, orders] = await Promise.all([getConfig(), listOrders()]);
  return <AdminDashboard initialConfig={config} orders={orders} storageReady={storageReady()} />;
}
