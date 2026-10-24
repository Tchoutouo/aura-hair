import { getDict, type Lang } from "@/i18n";
import { WHATSAPP_CHANNEL } from "@/lib/defaults";

/** Invitation to follow the Aurahair WhatsApp channel. */
export default function ChannelCta({ lang }: { lang: Lang }) {
  const t = getDict(lang).channel;
  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-whatsapp p-7 text-white md:flex-row md:items-center md:justify-between md:p-9">
      <div className="flex items-start gap-4">
        <svg viewBox="0 0 24 24" className="mt-1 h-9 w-9 shrink-0" fill="currentColor" aria-hidden="true">
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
        </svg>
        <div>
          <h2 className="font-display text-2xl font-bold md:text-3xl">{t.title}</h2>
          <p className="mt-2 max-w-2xl text-white/90">{t.text}</p>
        </div>
      </div>
      <a
        href={WHATSAPP_CHANNEL}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 self-start rounded-full bg-white px-6 py-3 font-semibold text-whatsapp hover:bg-white/90 md:self-center"
      >
        {t.cta}
      </a>
    </div>
  );
}
