"use client";

export default function PrintButton() {
  return (
    <p className="mt-4 text-center print:hidden">
      <button type="button" onClick={() => window.print()} className="rounded-full bg-plum px-5 py-2 text-sm font-semibold text-gold-soft">
        Enregistrer en PDF ou imprimer
      </button>
    </p>
  );
}
