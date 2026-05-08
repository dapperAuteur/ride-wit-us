import { NextRequest, NextResponse } from "next/server";
import { sendMail, getBamNotifyEmail, type MailgunResult } from "@/lib/mailgun";
import { sendToInbox, type WitusSendResult } from "@/lib/witus-sender";
import { APP_NAME } from "@/lib/site-meta";
import { episodeBySlug } from "@/lib/curriculum/episodes";
import { seasonOf } from "@/lib/curriculum/season-colors";

// Form-type taxonomy used by RideWitUS:
//   - class_notify_signup — { email, name?, selected_all, selected_seasons, selected_episodes }
//   - host_listen_party    — { org_name, contact, neighborhood, preferred_date?, notes }
//   - general_contact      — { name, email, message }
//
// On submission we send via Mailgun (mg.witus.online):
//   1. A confirmation/thank-you email to the submitter (when we have an email)
//   2. An alert to BAM at BAM_NOTIFY_EMAIL with the full payload
//
// Phase 4 (deferred) layers in: signed-HMAC forward to witus-inbox so triage
// has a single queue across the ecosystem. Mailgun stays as the per-app
// transactional sender.

interface ClassNotifyPayload {
  form_type: "class_notify_signup";
  email: string;
  name?: string;
  selected_all?: boolean;
  selected_seasons?: number[];
  selected_episodes?: string[];
}

interface HostListenPartyPayload {
  form_type: "host_listen_party";
  org_name: string;
  contact: string;
  neighborhood: string;
  preferred_date?: string;
  notes?: string;
}

interface GeneralContactPayload {
  form_type: "general_contact";
  name: string;
  email: string;
  message: string;
}

type Payload = ClassNotifyPayload | HostListenPartyPayload | GeneralContactPayload;

async function readPayload(req: NextRequest): Promise<Record<string, unknown> | null> {
  const ct = req.headers.get("content-type") ?? "";
  try {
    if (ct.includes("application/json")) {
      return (await req.json()) as Record<string, unknown>;
    }
    if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const out: Record<string, unknown> = {};
      for (const [k, v] of form.entries()) {
        out[k] = typeof v === "string" ? v : v.name;
      }
      return out;
    }
    // Try JSON as a last resort
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function describeNotifySelections(p: ClassNotifyPayload): string {
  if (p.selected_all) return "every new episode";
  const parts: string[] = [];
  if (p.selected_seasons?.length) {
    const seasonTitles = p.selected_seasons.map((n) => {
      try {
        return `Season ${n} (${seasonOf(n).title})`;
      } catch {
        return `Season ${n}`;
      }
    });
    parts.push(seasonTitles.join(", "));
  }
  if (p.selected_episodes?.length) {
    const epTitles = p.selected_episodes.map((slug) => {
      const ep = episodeBySlug(slug);
      return ep ? `S${ep.season}·E${String(ep.ep).padStart(2, "0")} ${ep.title}` : slug;
    });
    parts.push(epTitles.join(", "));
  }
  return parts.join(" + ") || "(no selections recorded)";
}

async function handleClassNotify(p: ClassNotifyPayload): Promise<MailgunResult[]> {
  const summary = describeNotifySelections(p);
  const greeting = p.name ? `Hi ${p.name},` : "Hi,";

  const subscriberEmail = sendMail({
    to: p.email,
    subject: `${APP_NAME} — confirmed: ${summary}`,
    text: `${greeting}\n\nWe'll let you know when ${summary} ${p.selected_all || (p.selected_episodes?.length ?? 0) > 1 ? "go" : "goes"} live.\n\nYou subscribed to:\n${summary}\n\nResubmit any time at https://ridewitus.witus.online/tune-in to update what you want notified about.\n\n— RideWitUS`,
    replyTo: getBamNotifyEmail(),
  });

  const bamAlert = sendMail({
    to: getBamNotifyEmail(),
    subject: `[RideWitUS] new notify-me signup: ${p.email}`,
    text: `New class_notify_signup\n\nEmail: ${p.email}\nName: ${p.name ?? "(not provided)"}\nSubscribed to: ${summary}\nselected_all: ${!!p.selected_all}\nselected_seasons: ${JSON.stringify(p.selected_seasons ?? [])}\nselected_episodes: ${JSON.stringify(p.selected_episodes ?? [])}`,
    replyTo: p.email,
  });

  return Promise.all([subscriberEmail, bamAlert]);
}

async function handleHostListenParty(p: HostListenPartyPayload): Promise<MailgunResult[]> {
  // We only have a free-form contact field, not a guaranteed email — so we
  // attempt to extract one for confirmation; otherwise we skip the submitter
  // confirmation and just alert BAM.
  const emailMatch = p.contact.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  const submitterEmail = emailMatch?.[0];

  const sends: Promise<MailgunResult>[] = [];

  if (submitterEmail) {
    sends.push(
      sendMail({
        to: submitterEmail,
        subject: `${APP_NAME} — got your listen-party invite`,
        text: `Thanks for the invite. We'll be in touch about ${p.org_name} (${p.neighborhood})${p.preferred_date ? ` for ${p.preferred_date}` : ""}.\n\n— RideWitUS`,
        replyTo: getBamNotifyEmail(),
      })
    );
  }

  sends.push(
    sendMail({
      to: getBamNotifyEmail(),
      subject: `[RideWitUS] listen-party invite: ${p.org_name}`,
      text: `New host_listen_party\n\nOrg: ${p.org_name}\nContact: ${p.contact}\nNeighborhood: ${p.neighborhood}\nPreferred date: ${p.preferred_date ?? "(none)"}\n\nNotes:\n${p.notes ?? "(none)"}`,
      replyTo: submitterEmail ?? getBamNotifyEmail(),
    })
  );

  return Promise.all(sends);
}

async function handleGeneralContact(p: GeneralContactPayload): Promise<MailgunResult[]> {
  const subscriberEmail = sendMail({
    to: p.email,
    subject: `${APP_NAME} — got your message`,
    text: `Hi ${p.name},\n\nThanks for reaching out. We'll reply soon.\n\n— RideWitUS`,
    replyTo: getBamNotifyEmail(),
  });

  const bamAlert = sendMail({
    to: getBamNotifyEmail(),
    subject: `[RideWitUS] contact: ${p.name}`,
    text: `New general_contact\n\nFrom: ${p.name} <${p.email}>\n\nMessage:\n${p.message}`,
    replyTo: p.email,
  });

  return Promise.all([subscriberEmail, bamAlert]);
}

export async function POST(req: NextRequest) {
  const raw = await readPayload(req);
  if (!raw) {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const formType = raw.form_type;
  if (typeof formType !== "string") {
    return NextResponse.json({ ok: false, error: "missing_form_type" }, { status: 400 });
  }

  // Coerce array-ish values from form-encoded bodies
  const normalizeArray = (v: unknown): unknown[] => {
    if (Array.isArray(v)) return v;
    if (typeof v === "string" && v.startsWith("[")) {
      try { return JSON.parse(v) as unknown[]; } catch { return []; }
    }
    return [];
  };

  let mailResults: MailgunResult[] = [];
  let inboxResult: WitusSendResult | null = null;

  try {
    if (formType === "class_notify_signup") {
      const p: ClassNotifyPayload = {
        form_type: "class_notify_signup",
        email: String(raw.email ?? ""),
        name: typeof raw.name === "string" && raw.name ? raw.name : undefined,
        selected_all: !!raw.selected_all,
        selected_seasons: normalizeArray(raw.selected_seasons).map((n) => Number(n)).filter((n) => Number.isInteger(n)),
        selected_episodes: normalizeArray(raw.selected_episodes).map(String),
      };
      if (!p.email) {
        return NextResponse.json({ ok: false, error: "missing_email" }, { status: 400 });
      }
      mailResults = await handleClassNotify(p);
    } else if (formType === "host_listen_party") {
      const p: HostListenPartyPayload = {
        form_type: "host_listen_party",
        org_name: String(raw.org_name ?? ""),
        contact: String(raw.contact ?? ""),
        neighborhood: String(raw.neighborhood ?? ""),
        preferred_date: typeof raw.preferred_date === "string" ? raw.preferred_date : undefined,
        notes: typeof raw.notes === "string" ? raw.notes : undefined,
      };
      if (!p.org_name || !p.contact || !p.neighborhood) {
        return NextResponse.json({ ok: false, error: "missing_required_fields" }, { status: 400 });
      }
      mailResults = await handleHostListenParty(p);
    } else if (formType === "general_contact") {
      const p: GeneralContactPayload = {
        form_type: "general_contact",
        name: String(raw.name ?? ""),
        email: String(raw.email ?? ""),
        message: String(raw.message ?? ""),
      };
      if (!p.name || !p.email || !p.message) {
        return NextResponse.json({ ok: false, error: "missing_required_fields" }, { status: 400 });
      }
      mailResults = await handleGeneralContact(p);
    } else {
      return NextResponse.json({ ok: false, error: `unknown_form_type:${formType}` }, { status: 400 });
    }

    // After sending email, also forward the raw payload to the WitUS Inbox
    // so triage has a single cross-product queue. This is fire-and-forget
    // semantically — if the Inbox is unreachable, we still consider the
    // form submission successful because the user got their email.
    inboxResult = await sendToInbox({
      form_type: formType,
      ...raw,
      _source_app: "ridewitus",
      _received_at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "internal_error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }

  const mailOk = mailResults.every((r) => r.ok);
  const anyMailStubbed = mailResults.some((r) => r.stubbed);

  return NextResponse.json({
    ok: mailOk,
    form_type: formType,
    mail: { count: mailResults.length, stubbed: anyMailStubbed },
    inbox: inboxResult ? { ok: inboxResult.ok, stubbed: !!inboxResult.stubbed } : null,
    ...(mailOk ? {} : { errors: mailResults.filter((r) => !r.ok).map((r) => r.error) }),
  });
}
