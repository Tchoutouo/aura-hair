import { getDict, type Lang } from "@/i18n";
import { fmtDay, nextShipment } from "@/lib/shipping";
import type { Config } from "@/lib/types";

/** Thin strip above the header: date of the next weekly shipment and arrival window. */
export default function ShipBanner({ lang, config }: { lang: Lang; config: Config }) {
  const { ship, arriveFrom, arriveTo } = nextShipment(config);
  return (
    <p className="bg-gold-soft px-4 py-2 text-center text-sm text-ink">
      {getDict(lang).ship.banner(fmtDay(ship, lang), fmtDay(arriveFrom, lang, false), fmtDay(arriveTo, lang, false))}
    </p>
  );
}
