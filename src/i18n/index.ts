import type { Lang } from "./config";
import en from "./en";
import fr, { type Dict } from "./fr";

const DICTS: Record<Lang, Dict> = { fr, en };

export const getDict = (lang: Lang): Dict => DICTS[lang];
export type { Dict };
export * from "./config";
