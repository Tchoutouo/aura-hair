import "server-only";
import { del } from "@vercel/blob";

/** Host of our Blob store, from its token ("vercel_blob_rw_<storeId>_<secret>"). */
function storeHost(): string | null {
  const id = process.env.BLOB_READ_WRITE_TOKEN?.split("_")[3];
  return id ? `${id.toLowerCase()}.public.blob.vercel-storage.com` : null;
}

/** Only photos uploaded to our own store are accepted. */
export function isOurPhoto(url: unknown): url is string {
  if (typeof url !== "string" || url.length > 500) return false;
  try {
    const u = new URL(url);
    const host = storeHost();
    return u.protocol === "https:" && (host ? u.hostname === host : u.hostname.endsWith(".public.blob.vercel-storage.com"));
  } catch {
    return false;
  }
}

export const cleanPhotos = (v: unknown, max: number) => (Array.isArray(v) ? v.filter(isOurPhoto).slice(0, max) : []);

/** Removes photos that are no longer used (never blocks the action if it fails). */
export async function deletePhotos(urls: string[]) {
  const ours = urls.filter(isOurPhoto);
  if (!ours.length || !process.env.BLOB_READ_WRITE_TOKEN) return;
  await del(ours).catch((e) => console.error("Blob delete failed", e));
}
