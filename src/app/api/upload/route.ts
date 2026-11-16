import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { allow, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

const IMAGES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Gives the browser a short-lived token to upload one photo straight to Vercel Blob.
 * "item": article photos, admin only. "review": a customer's photo with her review, rate-limited.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (clientPayload === "item") {
          if (!(await isAdmin())) throw new Error("Non autorisé.");
          if (!pathname.startsWith("articles/")) throw new Error("Chemin invalide.");
        } else if (clientPayload === "review") {
          if (!pathname.startsWith("avis/")) throw new Error("Chemin invalide.");
          if (!(await allow("upload", clientIp(req)))) throw new Error("Trop de photos envoyées aujourd'hui.");
        } else throw new Error("Envoi non autorisé.");
        return { allowedContentTypes: IMAGES, maximumSizeInBytes: 6 * 1024 * 1024, addRandomSuffix: true };
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur" }, { status: 400 });
  }
}
