import Image from "next/image";
import { getDict, type Lang } from "@/i18n";
import type { AvailableWig } from "@/lib/gestion/available";
import { fmtFcfa } from "@/lib/pricing";
import ReserveButton from "./ReserveButton";

export default function AvailableGrid({ lang, wigs }: { lang: Lang; wigs: AvailableWig[] }) {
  const t = getDict(lang).dispo;
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {wigs.map((w) => (
        <li key={w.id} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
          <Image src={w.image} alt={t.photoAlt(w.label)} width={480} height={480} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="aspect-square w-full object-cover" />
          <div className="flex flex-1 flex-col gap-3 p-4">
            <p className="flex-1 font-semibold text-plum">{w.label}</p>
            <p className="font-display text-2xl font-bold text-plum">{fmtFcfa(w.price)}</p>
            <ReserveButton lang={lang} itemId={w.id} label={w.label} />
          </div>
        </li>
      ))}
    </ul>
  );
}
