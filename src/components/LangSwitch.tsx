"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LANG_COOKIE, LANGS, type Lang } from "@/i18n/config";

// Inline SVG flags: emoji flags show as plain letters on Windows.
function Flag({ lang }: { lang: Lang }) {
  const cls = "h-3.5 w-5 shrink-0 rounded-[2px] ring-1 ring-black/10";
  if (lang === "fr")
    return (
      <svg viewBox="0 0 3 2" className={cls} aria-hidden="true">
        <rect width="1" height="2" fill="#002395" />
        <rect x="1" width="1" height="2" fill="#fff" />
        <rect x="2" width="1" height="2" fill="#ED2939" />
      </svg>
    );
  return (
    <svg viewBox="0 0 60 30" className={cls} aria-hidden="true">
      <clipPath id="uk-t">
        <path d="M30,15h30v15zv15h-30zh-30v-15zv-15h30z" />
      </clipPath>
      <path d="M0,0v30h60v-30z" fill="#012169" />
      <path d="M0,0 60,30M60,0 0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 60,30M60,0 0,30" clipPath="url(#uk-t)" stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0v30M0,15h60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0v30M0,15h60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}

const NAMES: Record<Lang, string> = { fr: "Français", en: "English" };

/** FR / EN switch with flags; links to the same page in the other language and remembers the choice. */
export default function LangSwitch({ lang, title }: { lang: Lang; title: string }) {
  const pathname = usePathname() ?? `/${lang}`;
  return (
    <div role="group" aria-label={title} className="inline-flex rounded-full border border-line bg-white p-0.5">
      {LANGS.map((l) => {
        const active = l === lang;
        return (
          <Link
            key={l}
            href={pathname.replace(/^\/(fr|en)(?=\/|$)/, `/${l}`)}
            hrefLang={l}
            lang={l}
            aria-label={NAMES[l]}
            aria-current={active ? "true" : undefined}
            onClick={() => {
              document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
            }}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
              active ? "bg-plum text-gold-soft" : "text-plum hover:bg-sand"
            }`}
          >
            <Flag lang={l} />
            {l.toUpperCase()}
          </Link>
        );
      })}
    </div>
  );
}
