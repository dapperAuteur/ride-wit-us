/**
 * Where queued events go: CentenarianOS's two mobility receivers (contract E8, E9). Each has a
 * full URL and its own secret, the same value set under the same name on CentenarianOS.
 *
 *   MOBILITY_ACTIVITY_EVENTS_URL / _SECRET   trip.summary → POST <centos>/api/events/mobility-activity
 *   MOBILITY_COST_EVENTS_URL / _SECRET       cost.recorded (and later trip.plan, forecast.item,
 *                                            vehicle.snapshot) → POST <centos>/api/events/mobility-cost
 *
 * No default URL: unset (or a non-http URL) = the drain skips that receiver and its rows stay pending,
 * so setting the env later delivers them (contract §1 "Failure without config").
 */
import type { OutboundReceiver } from "./events";

export const OUTBOUND_RECEIVERS: Record<OutboundReceiver, { urlEnv: string; secretEnv: string }> = {
  "centos.mobility_activity": { urlEnv: "MOBILITY_ACTIVITY_EVENTS_URL", secretEnv: "MOBILITY_ACTIVITY_EVENTS_SECRET" },
  "centos.mobility_cost": { urlEnv: "MOBILITY_COST_EVENTS_URL", secretEnv: "MOBILITY_COST_EVENTS_SECRET" },
};

export function outboundTarget(
  receiver: OutboundReceiver,
  env: Record<string, string | undefined> = process.env
): { url: URL; secret: string } | null {
  const spec = OUTBOUND_RECEIVERS[receiver];
  const raw = env[spec.urlEnv]?.trim();
  const secret = env[spec.secretEnv];
  if (!raw || !secret) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? { url, secret } : null;
  } catch {
    return null;
  }
}
