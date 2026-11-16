import "server-only";
import { after } from "next/server";
import { sendEmail } from "./email";
import { getConfig } from "./store";

/** An e-mail to the owners about something that just happened. */
export interface Notice {
  subject: string;
  title: string;
  /** Label / value pairs */
  rows?: [string, string][];
  /** Free lines (order text, list of articles…) */
  lines?: string[];
  /** Titled blocks, for longer e-mails such as the morning summary */
  sections?: { title: string; rows?: [string, string][]; lines?: string[] }[];
  link?: { label: string; url: string };
  /** Who did it (a partner in the management app, or the customer) */
  actor?: string;
  replyTo?: string;
}

const countryName = (code: string) => {
  try {
    return new Intl.DisplayNames(["fr"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
};

/** Phone or computer and browser, from the user agent. */
function device(ua: string): string {
  if (!ua) return "Inconnu";
  const os = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? `Android${(ua.match(/;\s*([^;)]+)\s+Build\//) ?? [])[1] ? ` (${ua.match(/;\s*([^;)]+)\s+Build\//)![1]})` : ""}`
        : /Windows/.test(ua)
          ? "Windows"
          : /Mac OS X/.test(ua)
            ? "Mac"
            : /Linux/.test(ua)
              ? "Linux"
              : "Autre";
  const browser = /SamsungBrowser/.test(ua)
    ? "Samsung Internet"
    : /Edg\//.test(ua)
      ? "Edge"
      : /OPR\/|Opera/.test(ua)
        ? "Opera"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /CriOS|Chrome\//.test(ua)
            ? "Chrome"
            : /Safari\//.test(ua)
              ? "Safari"
              : "";
  return browser ? `${os}, ${browser}` : os;
}

/**
 * Approximate place of the request, from Vercel's IP geolocation headers.
 * Mobile networks often show the operator's city rather than the person's.
 */
export function requestPlace(req: Request) {
  const h = req.headers;
  const dec = (v: string | null) => {
    try {
      return v ? decodeURIComponent(v) : "";
    } catch {
      return v ?? "";
    }
  };
  const city = dec(h.get("x-vercel-ip-city"));
  const region = dec(h.get("x-vercel-ip-country-region"));
  const country = h.get("x-vercel-ip-country") ?? "";
  const lat = h.get("x-vercel-ip-latitude");
  const lon = h.get("x-vercel-ip-longitude");
  const place = [city || region, country ? countryName(country) : ""].filter(Boolean).join(", ");
  return {
    place: place || "Inconnue",
    map: lat && lon ? `https://www.google.com/maps?q=${lat},${lon}` : undefined,
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "inconnue",
    device: device(h.get("user-agent") ?? ""),
  };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function render(n: Notice, ctx: ReturnType<typeof requestPlace> | null, when: string) {
  const context: [string, string][] = [
    ...(n.actor ? ([["Par", n.actor]] as [string, string][]) : []),
    ["Date", when],
    ...(ctx
      ? ([
          ["Lieu approximatif", ctx.place],
          ["Appareil", ctx.device],
          ["Adresse IP", ctx.ip],
        ] as [string, string][])
      : []),
  ];
  const text = [
    n.title,
    "",
    ...(n.rows ?? []).map(([k, v]) => `${k} : ${v}`),
    ...(n.lines?.length ? ["", ...n.lines] : []),
    ...(n.sections ?? []).flatMap((s) => ["", s.title.toUpperCase(), ...(s.rows ?? []).map(([k, v]) => `${k} : ${v}`), ...(s.lines ?? [])]),
    ...(n.link ? ["", `${n.link.label} : ${n.link.url}`] : []),
    "",
    "—",
    ...context.map(([k, v]) => `${k} : ${v}`),
    ...(ctx?.map ? [`Carte : ${ctx.map}`] : []),
  ].join("\n");

  const table = (rows: [string, string][], muted = false) =>
    rows.length
      ? `<table style="border-collapse:collapse;width:100%;font-size:14px${muted ? ";color:#5c4a52" : ""}">${rows
          .map(
            ([k, v]) =>
              `<tr><td style="padding:6px 12px 6px 0;vertical-align:top;white-space:nowrap;color:#5c4a52">${esc(k)}</td><td style="padding:6px 0;vertical-align:top;font-weight:600">${esc(v).replace(/\n/g, "<br>")}</td></tr>`,
          )
          .join("")}</table>`
      : "";
  const pre = (lines: string[]) =>
    `<pre style="font-family:inherit;white-space:pre-wrap;font-size:14px;background:#fbf7f2;padding:12px;border-radius:8px;margin:12px 0 0">${esc(lines.join("\n").replace(/\*/g, ""))}</pre>`;
  const html = `<div style="font-family:Arial,sans-serif;color:#2a1e24;max-width:600px;margin:0 auto">
  <div style="background:#3b2230;color:#f6e7c8;padding:16px 20px;border-radius:12px 12px 0 0;font-size:18px;font-weight:700">${esc(n.title)}</div>
  <div style="border:1px solid #e6d9cb;border-top:0;border-radius:0 0 12px 12px;padding:20px">
    ${table(n.rows ?? [])}
    ${n.lines?.length ? pre(n.lines) : ""}
    ${(n.sections ?? [])
      .map((s) => `<h2 style="font-size:16px;color:#3b2230;margin:22px 0 6px">${esc(s.title)}</h2>${table(s.rows ?? [])}${s.lines?.length ? pre(s.lines) : ""}`)
      .join("")}
    ${n.link ? `<p style="margin:16px 0 0"><a href="${esc(n.link.url)}" style="background:#3b2230;color:#f6e7c8;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:600">${esc(n.link.label)}</a></p>` : ""}
    <hr style="border:0;border-top:1px solid #e6d9cb;margin:20px 0">
    ${table(context, true)}
    ${ctx?.map ? `<p style="margin:8px 0 0;font-size:13px"><a href="${esc(ctx.map)}" style="color:#3b2230">Voir le lieu approximatif sur la carte</a></p>` : ""}
  </div>
</div>`;
  return { text: text.replace(/\*/g, ""), html };
}

/**
 * E-mails the owners after the response is sent, so it never slows the site down.
 * Address: NOTIFY_EMAIL, else the e-mail set in the admin settings, else ORDER_EMAIL_TO.
 */
export function notify(req: Request, n: Notice): void {
  const ctx = requestPlace(req);
  const when = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "short", timeZone: "Africa/Douala" }).format(new Date());
  after(async () => {
    try {
      const to = process.env.NOTIFY_EMAIL || (await getConfig()).orderEmail || process.env.ORDER_EMAIL_TO;
      if (!to) return;
      const { text, html } = render(n, ctx, when);
      await sendEmail(to, `[Aurahair] ${n.subject}`, text, n.replyTo, html);
    } catch (e) {
      console.error("notify failed", e);
    }
  });
}

/** Sends an e-mail to the owners right away (scheduled jobs: no visitor, no place). */
export async function mailOwners(n: Notice, attachments?: { filename: string; content: string }[]): Promise<boolean> {
  const to = process.env.NOTIFY_EMAIL || (await getConfig()).orderEmail || process.env.ORDER_EMAIL_TO;
  if (!to) return false;
  const when = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "short", timeZone: "Africa/Douala" }).format(new Date());
  const { text, html } = render(n, null, when);
  return sendEmail(to, `[Aurahair] ${n.subject}`, text, n.replyTo, html, attachments);
}
