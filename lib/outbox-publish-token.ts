import { createHash, timingSafeEqual } from "node:crypto";

function digest(v: string): Buffer {
  return createHash("sha256").update(v).digest();
}

/**
 * Does this Authorization header carry the configured `OUTBOX_PUBLISH_TOKEN`? Constant-time
 * (both sides are hashed to equal length first). Unset or blank token means false: no token is
 * configured, so none can match.
 */
export function hasPublishToken(authorization: string | null, configured = process.env.OUTBOX_PUBLISH_TOKEN): boolean {
  const token = configured?.trim();
  if (!token || !authorization?.startsWith("Bearer ")) return false;
  return timingSafeEqual(digest(authorization.slice("Bearer ".length).trim()), digest(token));
}
