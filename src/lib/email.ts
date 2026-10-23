import "server-only";

/** Sends a plain-text e-mail through Resend. Returns false when e-mail is not configured. */
export async function sendEmail(to: string, subject: string, text: string, replyTo?: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return false;
  const from = process.env.RESEND_FROM || "Aurahair <onboarding@resend.dev>";
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#2A1E24"><pre style="font-family:inherit;white-space:pre-wrap">${text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/\*/g, "")}</pre></div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, text: text.replace(/\*/g, ""), html, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  if (!res.ok) console.error("Resend error", res.status, await res.text());
  return res.ok;
}
