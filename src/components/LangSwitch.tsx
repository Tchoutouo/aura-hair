"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LANG_COOKIE, type Lang } from "@/i18n/config";

/** Same page in the other language; remembers the choice for the next visit. */
export default function LangSwitch({ lang, label, title }: { lang: Lang; label: string; title: string }) {
  const pathname = usePathname() ?? `/${lang}`;
  const other: Lang = lang === "fr" ? "en" : "fr";
  const href = pathname.replace(/^\/(fr|en)(?=\/|$)/, `/${other}`);
  return (
    <Link
      href={href}
      hrefLang={other}
      lang={other}
      aria-label={title}
      onClick={() => {
        document.cookie = `${LANG_COOKIE}=${other}; path=/; max-age=31536000; samesite=lax`;
      }}
      className="rounded-full border border-line px-3 py-1.5 text-plum hover:border-plum"
    >
      {label}
    </Link>
  );
}
