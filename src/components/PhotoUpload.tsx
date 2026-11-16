"use client";

import { upload } from "@vercel/blob/client";
import Image from "next/image";
import { useState } from "react";

/** Phone photos are often 4–8 MB: shrink to 1600 px JPEG before sending. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("photo"))), "image/jpeg", 0.85));
  } catch {
    return file;
  }
}

/** Uploads photos to Vercel Blob and returns their addresses. */
export default function PhotoUpload({
  kind,
  value,
  onChange,
  max = 4,
  labels = { add: "Ajouter une photo", sending: "Envoi de la photo…", remove: "Retirer la photo", error: "La photo n'a pas pu être envoyée." },
}: {
  kind: "item" | "review";
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  labels?: { add: string; sending: string; remove: string; error: string };
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    try {
      const urls = [...value];
      for (const file of [...files].slice(0, max - value.length)) {
        const blob = await shrink(file);
        const res = await upload(`${kind === "item" ? "articles" : "avis"}/photo.jpg`, blob, {
          access: "public",
          handleUploadUrl: "/api/upload",
          clientPayload: kind,
          contentType: "image/jpeg",
        });
        urls.push(res.url);
        onChange([...urls]);
      }
    } catch (e) {
      setError(e instanceof Error && e.message ? `${labels.error} (${e.message})` : labels.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {value.map((url) => (
          <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-line bg-sand">
            <Image src={url} alt="" fill sizes="80px" className="object-cover" />
            <button
              type="button"
              aria-label={labels.remove}
              onClick={() => onChange(value.filter((u) => u !== url))}
              className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink/70 text-sm text-white"
            >
              ×
            </button>
          </div>
        ))}
        {value.length < max && (
          <label className={`flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-line text-center text-xs text-muted hover:border-plum ${busy ? "opacity-50" : ""}`}>
            {busy ? labels.sending : `+ ${labels.add}`}
            <input type="file" accept="image/*" multiple={max > 1} disabled={busy} onChange={(e) => add(e.target.files)} className="sr-only" />
          </label>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs font-semibold text-wine">
          {error}
        </p>
      )}
    </div>
  );
}
