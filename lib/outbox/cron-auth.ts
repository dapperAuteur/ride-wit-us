/**
 * Vercel Cron calls a path with `Authorization: Bearer <CRON_SECRET>` when the project has a
 * CRON_SECRET env var (Vercel docs, "Securing cron jobs"). Unset = 503, never an open endpoint.
 */
import { timingSafeEqual } from "node:crypto";

export function cronAuthorized(header: string | null, secret: string | undefined): "ok" | "not_configured" | "unauthorized" {
  if (!secret) return "not_configured";
  const expected = Buffer.from(`Bearer ${secret}`, "utf8");
  const given = Buffer.from(header ?? "", "utf8");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return "unauthorized";
  return "ok";
}
