import type { MetadataRoute } from "next";
import { LANGS } from "@/i18n/config";
import { siteUrl } from "@/lib/site";

const PAGES = ["", "/commander", "/disponibles", "/textures", "/qualites", "/longueurs", "/galerie", "/avis", "/faq", "/contact", "/suivi"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return PAGES.map((p) => ({
    url: `${base}/fr${p}`,
    changeFrequency: p === "" || p === "/disponibles" ? "daily" : "weekly",
    priority: p === "" ? 1 : p === "/commander" || p === "/disponibles" ? 0.9 : 0.6,
    alternates: { languages: Object.fromEntries(LANGS.map((l) => [l, `${base}/${l}${p}`])) },
  }));
}
