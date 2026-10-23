export const LANGS = ["fr", "en"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "fr";
export const LANG_COOKIE = "aura_lang";

export const isLang = (v: unknown): v is Lang => LANGS.includes(v as Lang);
export const asLang = (v: unknown): Lang => (isLang(v) ? v : DEFAULT_LANG);
