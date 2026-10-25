import Link from "next/link";
import { getDict, type Lang } from "@/i18n";
import { WHATSAPP_CHANNEL } from "@/lib/defaults";
import type { Config } from "@/lib/types";

// +237 6xx xxx xxx (Cameroon), +84 xxx xxx xxx (Vietnam)
const pretty = (phone: string) =>
  phone.replace(/^(\+237|\+84|\+\d{1,3}?)(\d{3})(\d{3})(\d+)$/, "$1 $2 $3 $4");

export default function SiteFooter({ lang, contacts }: { lang: Lang; contacts: Config["contacts"] }) {
  const t = getDict(lang).footer;
  return (
    <footer className="mt-16 border-t-2 border-gold bg-plum text-gold-soft">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
        <div className="space-y-2">
          <p className="font-display text-2xl font-bold tracking-wide">Aurahair</p>
          <p className="text-sm text-gold-soft/80">{t.tagline}</p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-white">{t.whatsapp}</p>
          {contacts.map((c) => (
            <p key={c.phone}>
              <a className="hover:underline" href={`https://wa.me/${c.phone.replace(/[^\d]/g, "")}`}>
                {c.label} : {pretty(c.phone)}
              </a>
            </p>
          ))}
          <p>
            <a className="font-semibold text-white underline underline-offset-4" href={WHATSAPP_CHANNEL} target="_blank" rel="noopener noreferrer">
              {getDict(lang).channel.short}
            </a>
          </p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-white">{t.links}</p>
          <p><Link className="hover:underline" href={`/${lang}/commander?mode=detail`}>{t.detail}</Link></p>
          <p><Link className="hover:underline" href={`/${lang}/commander?mode=gros`}>{t.gros}</Link></p>
          <p><Link className="hover:underline" href={`/${lang}/qualites`}>{t.qualites}</Link></p>
          <p><Link className="hover:underline" href={`/${lang}/galerie`}>{getDict(lang).meta.galerie}</Link></p>
          <p><Link className="hover:underline" href={`/${lang}/suivi`}>{t.suivi}</Link></p>
          <p><Link className="hover:underline" href={`/${lang}/avis`}>{t.avis}</Link></p>
          <p><Link className="hover:underline" href={`/${lang}/faq`}>{t.faq}</Link></p>
          <p><Link className="hover:underline" href={`/${lang}/contact`}>{t.contact}</Link></p>
        </div>
      </div>
      <p className="pb-6 text-center text-xs text-gold-soft/60">© {new Date().getFullYear()} Aurahair Extension Co.</p>
    </footer>
  );
}
