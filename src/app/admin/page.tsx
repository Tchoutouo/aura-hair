import { adminConfigured, isAdmin } from "@/lib/auth";
import { getAllTracking, getConfig, listOrders, listRequests, listReviews, storageReady } from "@/lib/store";
import AdminDashboard from "@/components/AdminDashboard";
import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

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
  const [config, orders, requests, tracking, reviews] = await Promise.all([
    getConfig(),
    listOrders(),
    listRequests(),
    getAllTracking(),
    listReviews(),
  ]);
  return (
    <AdminDashboard
      initialConfig={config}
      orders={orders}
      requests={requests}
      tracking={tracking}
      initialReviews={reviews}
      storageReady={storageReady()}
    />
  );
}
