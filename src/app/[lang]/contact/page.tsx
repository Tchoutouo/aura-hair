import type { Metadata } from "next";
import { asLang, getDict } from "@/i18n";
import { getConfig } from "@/lib/store";
import ContactForm from "@/components/ContactForm";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<{ sujet?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: getDict(asLang((await params).lang)).meta.contact };
}

export default async function ContactPage({ params, searchParams }: Props) {
  const lang = asLang((await params).lang);
  const { sujet } = await searchParams;
  const t = getDict(lang).contact;
  const config = await getConfig();
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold text-plum md:text-5xl">{t.title}</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">{t.lead}</p>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.2fr]">
        <dl className="space-y-6">
          {Object.entries(t.services).map(([key, [title, text]]) => (
            <div key={key} className="border-l-4 border-gold pl-5">
              <dt className="font-display text-xl font-bold text-plum">{title}</dt>
              <dd className="mt-1 text-muted">{text}</dd>
            </div>
          ))}
        </dl>
        <ContactForm lang={lang} contacts={config.contacts} initialSubject={sujet} />
      </div>
    </div>
  );
}
