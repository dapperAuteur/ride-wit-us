/**
 * Reads a receiver's per-row refusals from an event-batch answer. Ported from CentenarianOS
 * `lib/integrations/outbox.ts` `rejectedIds`, so both outboxes treat answers the same way
 * (contract §1 "Event response").
 *
 * A 2xx answer means the batch arrived. `rejected` lists refusals as `{ event_id, reason }` objects
 * (the form new receivers use) or as strings that start with the event_id (CentenarianOS's older
 * income receiver). Rows not named are sent. `unknown_subject` means "wait": the person has not
 * signed in to the other app with WitUS yet, so the row stays pending and never fails.
 */
export function rejectedIds(body: unknown, sentIds: readonly string[]): Map<string, string> {
  const out = new Map<string, string>();
  const list = body && typeof body === "object" ? (body as { rejected?: unknown }).rejected : null;
  if (!Array.isArray(list)) return out;
  for (const item of list) {
    if (item && typeof item === "object") {
      const id = (item as { event_id?: unknown }).event_id;
      const reason = (item as { reason?: unknown }).reason;
      if (typeof id === "string") out.set(id, typeof reason === "string" ? reason : "rejected");
    } else if (typeof item === "string") {
      const id = sentIds.find((candidate) => item.startsWith(candidate));
      if (id) {
        out.set(
          id,
          item.includes("unknown_subject") ? "unknown_subject" : item.slice(id.length).replace(/^[:\s-]+/, "") || "rejected"
        );
      }
    }
  }
  return out;
}
