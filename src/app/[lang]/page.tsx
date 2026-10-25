import Image from "next/image";
import Link from "next/link";
import { getDict, isLang } from "@/i18n";
import { TEXTURES, textureImage } from "@/lib/defaults";
import { mediaSrc, VIDEOS } from "@/lib/media";
import { fmtFcfa } from "@/lib/pricing";
import { getConfig, listReviews } from "@/lib/store";
import { CLOSURE_SIZES } from "@/lib/types";
import ChannelCta from "@/components/ChannelCta";
import ReviewList from "@/components/ReviewList";
import VideoCard from "@/components/VideoCard";

export const dynamic = "force-dynamic";

const featured = ["Body Wave", "Deep Wave", "Kinky Curly", "Loose Wave", "Water Wave", "Pixie Curly", "Bouncy Curly", "Cambodian Wavy"];
const homeVideos = ["virgin-18-closure-2x6", "bordeaux-lisse", "deep-curly-long", "double-ton-marron"];

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params;
  const lang = isLang(raw) ? raw : "fr";
  const d = getDict(lang);
  const t = d.home;
  const [config, allReviews] = await Promise.all([getConfig(), listReviews()]);
  const reviews = allReviews.filter((r) => r.status === "approved").slice(0, 3);
  const shipVideo = VIDEOS.find((v) => v.id === "colis-pret")!;

  return (
    <>
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-10 pb-16 md:grid-cols-[1.1fr_1fr] md:pt-16">
        <div className="space-y-6">
          <p className="inline-block rounded-full bg-plum px-4 py-1.5 text-sm font-semibold text-gold-soft">{t.kicker}</p>
          <h1 className="font-display text-4xl font-bold leading-tight text-plum md:text-6xl">{t.title}</h1>
          <p className="text-lg text-muted">{t.lead}</p>
          <div className="flex flex-wrap gap-3">
            <Link href={`/${lang}/commander?mode=detail`} className="rounded-full bg-plum px-6 py-3 font-semibold text-gold-soft hover:bg-plum-2">
              {t.ctaDetail}
            </Link>
            <Link href={`/${lang}/commander?mode=gros`} className="rounded-full border-2 border-plum px-6 py-3 font-semibold text-plum hover:bg-sand">
              {t.ctaGros}
            </Link>
          </div>
          <p className="text-sm text-muted">{t.shipping(fmtFcfa(config.shippingFcfaPerKg))}</p>
        </div>
        <figure>
          <Image
            src={mediaSrc("meches-bordeaux-curly", "jpg")}
            alt={d.media["meches-bordeaux-curly"]}
            width={1080}
            height={1080}
            priority
            sizes="(min-width: 768px) 45vw, 100vw"
            className="aspect-square w-full rounded-2xl object-cover"
          />
          <figcaption className="mt-2 text-sm text-muted">{t.heroCaption}</figcaption>
        </figure>
      </section>

      {/* Trust: the order's journey, with real photos from the warehouse */}
      <section className="bg-plum text-gold-soft">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="max-w-3xl font-display text-3xl font-bold text-white md:text-4xl">{t.trustTitle}</h2>
          <p className="mt-3 max-w-2xl text-gold-soft/85">{t.trustLead}</p>
          <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.1fr]">
            <ol className="relative space-y-7 border-l-2 border-gold/50 pl-7">
              {t.trustSteps.map(([title, text], i) => (
                <li key={title} className="relative">
                  <span className="absolute -left-[2.6rem] flex h-8 w-8 items-center justify-center rounded-full bg-gold font-display font-bold text-ink">
                    {i + 1}
                  </span>
                  <p className="text-lg font-semibold text-white">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-gold-soft/85">{text}</p>
                </li>
              ))}
            </ol>
            <div className="grid grid-cols-2 gap-3">
              <figure className="row-span-2">
                <Image
                  src={mediaSrc("commandes-verifiees", "jpg")}
                  alt={d.media["commandes-verifiees"]}
                  width={1200}
                  height={1600}
                  sizes="(min-width: 1024px) 28vw, 50vw"
                  className="h-full w-full rounded-xl object-cover"
                />
                <figcaption className="mt-2 text-xs text-gold-soft/75">{t.trustPhoto1}</figcaption>
              </figure>
              <figure>
                <Image
                  src={mediaSrc("carton-expedition", "jpg")}
                  alt={d.media["carton-expedition"]}
                  width={607}
                  height={1080}
                  sizes="(min-width: 1024px) 28vw, 50vw"
                  className="aspect-[4/5] w-full rounded-xl object-cover"
                />
                <figcaption className="mt-2 text-xs text-gold-soft/75">{t.trustPhoto2}</figcaption>
              </figure>
              <figure>
                <video
                  controls
                  playsInline
                  preload="none"
                  poster={mediaSrc(shipVideo.id, "jpg")}
                  aria-label={t.trustVideo}
                  className="aspect-[4/5] w-full rounded-xl bg-plum-2 object-cover"
                >
                  <source src={mediaSrc(shipVideo.id, "mp4")} type="video/mp4" />
                </video>
                <figcaption className="mt-2 text-xs text-gold-soft/75">{t.trustVideo}</figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="comment" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16">
        <h2 className="font-display text-3xl font-bold text-plum md:text-4xl">{t.howTitle}</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-4">
          {t.howSteps.map(([title, text], i) => (
            <li key={title} className="border-t-2 border-gold pt-4">
              <span className="font-display text-3xl font-bold text-gold">{i + 1}</span>
              <p className="mt-2 font-semibold text-plum">{title}</p>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Detail vs Gros */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Link href={`/${lang}/commander?mode=detail`} className="group rounded-2xl border-2 border-plum bg-white p-7 hover:bg-sand">
            <p className="text-sm font-semibold text-rust">{t.detailTag}</p>
            <p className="mt-1 font-display text-2xl font-bold text-plum">{t.detailTitle}</p>
            <p className="mt-2 text-muted">{t.detailText}</p>
            <p className="mt-4 font-semibold text-plum underline-offset-4 group-hover:underline">{t.detailLink}</p>
          </Link>
          <Link href={`/${lang}/commander?mode=gros`} className="group rounded-2xl border-2 border-gold bg-white p-7 hover:bg-sand">
            <p className="text-sm font-semibold text-rust">{t.grosTag}</p>
            <p className="mt-1 font-display text-2xl font-bold text-plum">{t.grosTitle}</p>
            <p className="mt-2 text-muted">{t.grosText}</p>
            <p className="mt-4 font-semibold text-plum underline-offset-4 group-hover:underline">{t.grosLink}</p>
          </Link>
        </div>
      </section>

      {/* Videos */}
      <section className="mx-auto max-w-6xl px-4 pt-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-bold text-plum md:text-4xl">{t.videosTitle}</h2>
            <p className="mt-2 max-w-2xl text-muted">{t.videosLead}</p>
          </div>
          <Link href={`/${lang}/galerie`} className="font-semibold text-plum underline underline-offset-4">
            {t.videosLink}
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {homeVideos.map((id) => (
            <VideoCard key={id} item={VIDEOS.find((v) => v.id === id)!} caption={d.media[id]} />
          ))}
        </div>
      </section>

      {/* Customer reviews: shown once at least one is approved */}
      {reviews.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-3xl font-bold text-plum md:text-4xl">{d.reviews.title}</h2>
            <Link href={`/${lang}/avis`} className="font-semibold text-plum underline underline-offset-4">
              {d.reviews.homeLink}
            </Link>
          </div>
          <div className="mt-8">
            <ReviewList lang={lang} reviews={reviews} />
          </div>
        </section>
      )}

      {/* Hair grades */}
      <section className="mx-auto max-w-6xl px-4 pt-16">
        <div className="grid items-center gap-8 rounded-2xl bg-sand p-7 md:grid-cols-[1fr_auto] md:p-10">
          <div>
            <h2 className="font-display text-2xl font-bold text-plum md:text-3xl">{t.qualitiesTitle}</h2>
            <p className="mt-2 max-w-2xl text-muted">{t.qualitiesText}</p>
          </div>
          <Link href={`/${lang}/qualites`} className="justify-self-start rounded-full bg-plum px-6 py-3 font-semibold text-gold-soft hover:bg-plum-2">
            {t.qualitiesLink}
          </Link>
        </div>
      </section>

      {/* Textures preview */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-3xl font-bold text-plum md:text-4xl">{t.texturesTitle}</h2>
          <Link href={`/${lang}/textures`} className="font-semibold text-plum underline underline-offset-4">
            {t.texturesLink(TEXTURES.length)}
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {featured.map((name) => (
            <figure key={name} className="rounded-xl border border-line bg-white p-2">
              <Image src={textureImage(name)!} alt={name} width={480} height={480} className="aspect-square w-full rounded-lg object-cover" />
              <figcaption className="py-2 text-center text-sm font-semibold text-plum">{name}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Closures */}
      <section id="closures" className="mx-auto grid max-w-6xl scroll-mt-24 items-center gap-10 px-4 md:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white p-3">
          <Image src="/closures.jpg" alt={t.closuresAlt} width={714} height={720} className="w-full rounded-xl" />
        </div>
        <div className="space-y-6">
          <h2 className="font-display text-3xl font-bold text-plum md:text-4xl">{t.closuresTitle}</h2>
          <p className="text-muted">{t.closuresText}</p>
          <div className="flex flex-wrap gap-2">
            {CLOSURE_SIZES.map((s) => (
              <span key={s} className={`rounded-lg px-4 py-2 text-lg font-bold ${s.startsWith("13") ? "bg-gold text-ink" : "bg-plum text-gold-soft"}`}>
                {s}
              </span>
            ))}
          </div>
          <Link href={`/${lang}/commander?mode=detail`} className="inline-block rounded-full bg-plum px-6 py-3 font-semibold text-gold-soft hover:bg-plum-2">
            {t.closuresCta}
          </Link>
        </div>
      </section>

      {/* WhatsApp channel */}
      <section className="mx-auto max-w-6xl px-4 pt-16">
        <ChannelCta lang={lang} />
      </section>

      {/* Other services */}
      <section className="mx-auto max-w-6xl px-4 pt-16">
        <div className="flex flex-col gap-5 border-y-2 border-gold py-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-plum md:text-3xl">{t.servicesTitle}</h2>
            <p className="mt-2 max-w-2xl text-muted">{t.servicesText}</p>
          </div>
          <Link href={`/${lang}/contact`} className="shrink-0 self-start rounded-full border-2 border-plum px-6 py-3 font-semibold text-plum hover:bg-sand md:self-center">
            {t.servicesCta}
          </Link>
        </div>
      </section>
    </>
  );
}
