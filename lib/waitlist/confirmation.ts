/**
 * The "you're on the waitlist" email (PRD §5.12, owner answer §13 Q16: yes, send a confirmation).
 *
 * Plain text only: no HTML, so no tracking pixel, and Mailgun's open/click tracking is turned off
 * for the message. Removal is by reply, because the app has no unsubscribe link yet.
 */
import { getBamNotifyEmail, mailConfigured, sendMail, type MailgunMessage } from "@/lib/mailgun";
import { APP_NAME, SITE_URL } from "@/lib/site-meta";

export function buildWaitlistConfirmation(email: string, replyTo: string): MailgunMessage {
  const text = [
    "Hi,",
    "",
    `You're on the ${APP_NAME} waitlist. Thanks for signing up.`,
    "",
    "What happens next",
    `${APP_NAME} is in a private trial while we build it. When a spot opens, we'll email this address with an invitation to sign in with your WitUS account. Until then, this is the only email you'll get from the waitlist.`,
    "",
    "Want off the list?",
    "Reply to this email and say so. We'll remove your address and won't email you again.",
    "",
    "Didn't sign up? Someone may have typed your address by mistake. Reply and we'll remove it, or ignore this message.",
    "",
    `- ${APP_NAME}`,
    SITE_URL,
  ].join("\n");

  return {
    to: email,
    subject: `You're on the ${APP_NAME} waitlist`,
    text,
    replyTo,
    noTracking: true,
  };
}

export type ConfirmationOutcome = "sent" | "skipped_no_mail_config" | "failed";

/**
 * Send the confirmation. Never throws. Without Mailgun configured it sends nothing and says so,
 * so the caller does not record a send that never happened. Logs never include the address.
 */
export async function sendWaitlistConfirmation(email: string): Promise<ConfirmationOutcome> {
  if (!mailConfigured()) {
    console.log("[waitlist] confirmation skipped: Mailgun not configured");
    return "skipped_no_mail_config";
  }
  try {
    const result = await sendMail(buildWaitlistConfirmation(email, getBamNotifyEmail()));
    if (result.ok && !result.stubbed) return "sent";
    console.error("[waitlist] confirmation failed status=%s", result.status ?? "none");
    return "failed";
  } catch (err) {
    console.error("[waitlist] confirmation failed err=%s", err instanceof Error ? err.name : "UnknownError");
    return "failed";
  }
}
