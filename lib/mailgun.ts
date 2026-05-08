// lib/mailgun.ts — Mailgun HTTP-API client.
//
// RideWitUS sends transactional email via Mailgun on the canonical ecosystem
// domain mg.witus.online. Configuration is environment-driven; if MAILGUN_API_KEY
// is unset (e.g., local dev without secrets), sendMail() logs to stdout and
// returns a stub success so the form UX is testable without provisioning.
//
// Environment variables (BAM provisions via `vercel env add`):
//   MAILGUN_API_KEY      — required for actual sending; private API key
//   MAILGUN_DOMAIN       — defaults to "mg.witus.online"
//   MAILGUN_REGION       — "us" (default) or "eu"
//   MAILGUN_FROM         — defaults to "RideWitUS <noreply@${MAILGUN_DOMAIN}>"
//   BAM_NOTIFY_EMAIL     — defaults to bam@awews.com (where form alerts go)
//
// Reference: https://documentation.mailgun.com/docs/mailgun/api-reference/openapi-final/tag/Messages/

export interface MailgunMessage {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

export interface MailgunResult {
  ok: boolean;
  stubbed?: boolean;
  status?: number;
  id?: string;
  error?: string;
}

const DEFAULT_DOMAIN = "mg.witus.online";

function getConfig() {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN ?? DEFAULT_DOMAIN;
  const region = (process.env.MAILGUN_REGION ?? "us").toLowerCase();
  const baseUrl = region === "eu" ? "https://api.eu.mailgun.net" : "https://api.mailgun.net";
  const from = process.env.MAILGUN_FROM ?? `RideWitUS <noreply@${domain}>`;
  const bamNotifyEmail = process.env.BAM_NOTIFY_EMAIL ?? "bam@awews.com";
  return { apiKey, domain, baseUrl, from, bamNotifyEmail };
}

export async function sendMail(message: MailgunMessage): Promise<MailgunResult> {
  const cfg = getConfig();

  if (!cfg.apiKey) {
    // No API key in env — stub. Log to stdout so dev can see what would have
    // been sent. Returns ok:true so form UX flows continue.
    // eslint-disable-next-line no-console
    console.log("[mailgun stub]", JSON.stringify({
      from: cfg.from,
      to: message.to,
      subject: message.subject,
      text: message.text.slice(0, 200) + (message.text.length > 200 ? "…" : ""),
    }));
    return { ok: true, stubbed: true };
  }

  const url = `${cfg.baseUrl}/v3/${cfg.domain}/messages`;
  const body = new URLSearchParams();
  body.set("from", cfg.from);
  const recipients = Array.isArray(message.to) ? message.to : [message.to];
  for (const r of recipients) body.append("to", r);
  body.set("subject", message.subject);
  body.set("text", message.text);
  if (message.html) body.set("html", message.html);
  if (message.replyTo) body.set("h:Reply-To", message.replyTo);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${cfg.apiKey}`).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, status: res.status, error: text.slice(0, 500) };
    }

    const json = (await res.json()) as { id?: string };
    return { ok: true, status: res.status, id: json.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown_error" };
  }
}

export function getBamNotifyEmail(): string {
  return getConfig().bamNotifyEmail;
}
