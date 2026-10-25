import Image from "next/image";
import Link from "next/link";
import { getDict, type Lang } from "@/i18n";
import LangSwitch from "./LangSwitch";

export default function SiteHeader({ lang }: { lang: Lang }) {
  const t = getDict(lang).nav;
  const link = "hover:text-plum";
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ivory/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href={`/${lang}`} aria-label={t.home} className="shrink-0">
          <Image src="/logo.png" alt="Aurahair Extension Co." width={438} height={257} className="h-12 w-auto mix-blend-multiply" priority />
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2 text-sm font-medium text-muted">
          <Link href={`/${lang}/textures`} className={`hidden md:inline ${link}`}>{t.textures}</Link>
          <Link href={`/${lang}/qualites`} className={`hidden md:inline ${link}`}>{t.qualites}</Link>
          <Link href={`/${lang}/galerie`} className={`hidden md:inline ${link}`}>{t.galerie}</Link>
          <Link href={`/${lang}/suivi`} className={`hidden sm:inline ${link}`}>{t.suivi}</Link>
          <Link href={`/${lang}/contact`} className={`hidden lg:inline ${link}`}>{t.contact}</Link>
          <LangSwitch lang={lang} title={t.switchLabel} />
          <Link href={`/${lang}/commander`} className="rounded-full bg-plum px-4 py-2 text-gold-soft hover:bg-plum-2">
            {t.cta}
          </Link>
        </nav>
      </div>
    </header>
  );
}
