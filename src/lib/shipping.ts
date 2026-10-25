import type { Lang } from "@/i18n";
import type { Config } from "./types";

/** Shipments leave from Vietnam: dates are computed in Vietnam time. */
const TZ = "Asia/Ho_Chi_Minh";
const DAY = 24 * 3600 * 1000;
/** On shipping day, orders before this hour (Vietnam time) still count for today's shipment. */
const SAME_DAY_UNTIL_HOUR = 12;

function vietnamParts(d: Date) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", hour: "numeric", hourCycle: "h23" }).formatToParts(d);
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.find((x) => x.type === "weekday")!.value);
  const hour = Number(p.find((x) => x.type === "hour")!.value);
  return { wd, hour };
}

/** Next weekly shipment and the estimated arrival window in Cameroon. */
export function nextShipment(config: Pick<Config, "shipWeekday" | "transitDays">, now = new Date()) {
  const { wd, hour } = vietnamParts(now);
  let days = (config.shipWeekday - wd + 7) % 7;
  if (days === 0 && hour >= SAME_DAY_UNTIL_HOUR) days = 7;
  const ship = new Date(now.getTime() + days * DAY);
  return {
    ship,
    arriveFrom: new Date(ship.getTime() + config.transitDays.min * DAY),
    arriveTo: new Date(ship.getTime() + config.transitDays.max * DAY),
  };
}

const LOCALE: Record<Lang, string> = { fr: "fr-FR", en: "en-GB" };

export function fmtDay(d: Date, lang: Lang, weekday = true): string {
  const s = new Intl.DateTimeFormat(LOCALE[lang], { timeZone: TZ, ...(weekday ? { weekday: "long" } : {}), day: "numeric", month: "long" }).format(d);
  // French writes the first day of the month "1er".
  return lang === "fr" ? s.replace(/(^|\s)1(?= )/, "$11er") : s;
}
