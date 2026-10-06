/**
 * The public podcast forms (`/api/inbox-ingest`) and the WitUS Inbox submission each one produces.
 * Pure, so the tests can build the exact body and check it against the Inbox's rules.
 */
import { z } from "zod";
import type { InboxSubmission } from "./sender-inbox";

export interface ClassNotifyPayload {
  form_type: "class_notify_signup";
  email: string;
  name?: string;
  selected_all?: boolean;
  selected_seasons?: number[];
  selected_episodes?: string[];
}

export interface HostListenPartyPayload {
  form_type: "host_listen_party";
  org_name: string;
  contact: string;
  neighborhood: string;
  preferred_date?: string;
  notes?: string;
}

export interface GeneralContactPayload {
  form_type: "general_contact";
  name: string;
  email: string;
  message: string;
}

export type FormPayload = ClassNotifyPayload | HostListenPartyPayload | GeneralContactPayload;

// Same validator the Inbox applies to `submitter_email` (zod 4 `z.string().email().max(255)`).
const inboxEmail = z.string().email().max(255);
const inboxName = z.string().min(1).max(255);

/** The address, if the Inbox will accept it as `submitter_email`; otherwise undefined. */
function acceptedEmail(v: string | undefined): string | undefined {
  const trimmed = v?.trim();
  return trimmed && inboxEmail.safeParse(trimmed).success ? trimmed : undefined;
}

function acceptedName(v: string | undefined): string | undefined {
  const trimmed = v?.trim();
  return trimmed && inboxName.safeParse(trimmed).success ? trimmed : undefined;
}

/** A free-form contact field may hold an email address; pull out the first one. */
export function emailFromContact(contact: string): string | undefined {
  return contact.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0];
}

/**
 * Build the Inbox submission for one validated form. The Inbox requires a `payload` object and
 * drops any other unknown top-level key, so every form field goes inside `payload`.
 * `submitter_email` / `submitter_name` are included only when they pass the Inbox's own rules,
 * because a malformed value there would make the Inbox reject the whole submission.
 */
export function buildFormInboxSubmission(p: FormPayload): InboxSubmission {
  const { form_type, ...fields } = p;
  let email: string | undefined;
  let name: string | undefined;
  if (p.form_type === "class_notify_signup") {
    email = acceptedEmail(p.email);
    name = acceptedName(p.name);
  } else if (p.form_type === "general_contact") {
    email = acceptedEmail(p.email);
    name = acceptedName(p.name);
  } else {
    email = acceptedEmail(emailFromContact(p.contact));
  }
  return {
    form_type,
    ...(email ? { submitter_email: email } : {}),
    ...(name ? { submitter_name: name } : {}),
    priority: "normal",
    payload: { app: "RideWitUS", ...fields },
  };
}
