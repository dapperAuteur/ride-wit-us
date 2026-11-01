/**
 * Signed calls from RideWitUS to CentenarianOS (contract E1 to E4, centenarian-os
 * docs/integrations/ridewitus-contract.md). Server-only: the secrets never reach the browser.
 *
 * Env (names from the contract; values set on both apps, never pasted):
 *   CENTOS_API_URL           CentenarianOS's base URL, e.g. its primary domain from its Vercel project.
 *                            No default: an unset URL means "not switched on", never a guessed host.
 *   RIDE_VENDOR_API_SECRET   E1 to E3, GET /api/v1/ride/vendors...
 *   RIDE_RESYNC_SECRET       E4, POST /api/v1/ride/resync
 * Either missing for a call = `not_configured`, and no request is made.
 *
 * Every answer becomes a CentosResult: the data, or a `problem` the screen turns into words
 * (lib/centos/messages.ts). 4 s timeout by default (contract E1: RideWitUS times out at 4 s).
 */
import { buildUrl, getSigned, postSigned, type FetchLike, type SignedResult } from "@/lib/signed/client";
import { SOURCE } from "@/lib/signed/receiver";

export const CENTOS_URL_ENV = "CENTOS_API_URL";

/** One secret per CentenarianOS endpoint, so each can be rotated alone. */
export const CENTOS_SECRETS = {
  vendors: "RIDE_VENDOR_API_SECRET",
  resync: "RIDE_RESYNC_SECRET",
} as const;

export type CentosEndpoint = keyof typeof CENTOS_SECRETS;

export const CENTOS_TIMEOUT_MS = 4000;

/**
 * Why a call did not return data.
 *   not_configured   CENTOS_API_URL or the endpoint's secret is unset here, or CentOS answered 503
 *   unknown_subject  CentOS has no account linked to this WitUS user yet (sign in there once)
 *   not_found        the item is not this user's (or does not exist)
 *   rate_limited     429; retryAfterSeconds is set when CentOS sent Retry-After
 *   unauthorized     401: the secrets differ between the apps, or the clocks are more than 300 s apart
 *   bad_request      400
 *   timeout          no answer within the timeout
 *   unavailable      network error or 5xx
 *   invalid_response the answer was not the expected shape
 */
export type CentosProblem =
  | "not_configured"
  | "unknown_subject"
  | "not_found"
  | "rate_limited"
  | "unauthorized"
  | "bad_request"
  | "timeout"
  | "unavailable"
  | "invalid_response";

export type CentosResult<T> =
  | { ok: true; data: T }
  | { ok: false; problem: CentosProblem; status: number; code?: string; retryAfterSeconds?: number };

export interface CentosCallOptions {
  env?: Record<string, string | undefined>;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  nowSeconds?: number;
}

type Params = Record<string, string | number | null | undefined>;

interface Ready {
  base: string;
  secret: string;
}

function readiness(endpoint: CentosEndpoint, env: Record<string, string | undefined>): Ready | null {
  const base = env[CENTOS_URL_ENV]?.trim();
  const secret = env[CENTOS_SECRETS[endpoint]];
  if (!base || !secret) return null;
  try {
    const url = new URL(base);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  } catch {
    return null;
  }
  return { base, secret };
}

/** True when a call to `endpoint` would be attempted. */
export function centosConfigured(endpoint: CentosEndpoint, env: Record<string, string | undefined> = process.env): boolean {
  return readiness(endpoint, env) !== null;
}

/** Map a signed-call result onto data or a problem. `parse` checks the `data` member's shape. */
export function interpret<T>(result: SignedResult, parse: (data: unknown) => T | null): CentosResult<T> {
  const envelope = result.body && typeof result.body === "object" ? (result.body as Record<string, unknown>) : null;
  const code = typeof envelope?.code === "string" ? envelope.code : undefined;
  if (result.ok) {
    if (envelope?.ok !== true) return { ok: false, problem: "invalid_response", status: result.status };
    const data = parse(envelope.data);
    return data === null ? { ok: false, problem: "invalid_response", status: result.status } : { ok: true, data };
  }
  const status = result.status;
  if (result.error === "timeout") return { ok: false, problem: "timeout", status };
  if (status === 0) return { ok: false, problem: "unavailable", status };
  if (status === 404) return { ok: false, problem: code === "unknown_subject" ? "unknown_subject" : "not_found", status, code };
  if (status === 429) {
    const seconds = result.retryAfter ? Number.parseInt(result.retryAfter, 10) : Number.NaN;
    return { ok: false, problem: "rate_limited", status, code, ...(Number.isFinite(seconds) ? { retryAfterSeconds: seconds } : {}) };
  }
  if (status === 401) return { ok: false, problem: "unauthorized", status, code };
  if (status === 503 && code === "not_configured") return { ok: false, problem: "not_configured", status, code };
  if (status === 400) return { ok: false, problem: "bad_request", status, code };
  return { ok: false, problem: "unavailable", status, code };
}

/** Signed GET to CentenarianOS. */
export async function centosGet<T>(
  endpoint: CentosEndpoint,
  path: string,
  params: Params,
  parse: (data: unknown) => T | null,
  options: CentosCallOptions = {}
): Promise<CentosResult<T>> {
  const ready = readiness(endpoint, options.env ?? process.env);
  if (!ready) return { ok: false, problem: "not_configured", status: 0 };
  const url = buildUrl(ready.base, path, params);
  const result = await getSigned(url, {
    secret: ready.secret,
    source: SOURCE.rideWitus,
    fetchImpl: options.fetchImpl,
    timeoutMs: options.timeoutMs ?? CENTOS_TIMEOUT_MS,
    nowSeconds: options.nowSeconds,
  });
  const outcome = interpret(result, parse);
  if (!outcome.ok) console.warn("[centos] GET %s failed problem=%s status=%d", path.split("?")[0], outcome.problem, outcome.status);
  return outcome;
}

/** Signed POST to CentenarianOS (E4 "Sync now" uses it; a 429 carries retryAfterSeconds). */
export async function centosPost<T>(
  endpoint: CentosEndpoint,
  path: string,
  payload: unknown,
  parse: (data: unknown) => T | null,
  options: CentosCallOptions = {}
): Promise<CentosResult<T>> {
  const ready = readiness(endpoint, options.env ?? process.env);
  if (!ready) return { ok: false, problem: "not_configured", status: 0 };
  const result = await postSigned(buildUrl(ready.base, path), payload, {
    secret: ready.secret,
    source: SOURCE.rideWitus,
    fetchImpl: options.fetchImpl,
    timeoutMs: options.timeoutMs ?? CENTOS_TIMEOUT_MS,
    nowSeconds: options.nowSeconds,
  });
  const outcome = interpret(result, parse);
  if (!outcome.ok) console.warn("[centos] POST %s failed problem=%s status=%d", path, outcome.problem, outcome.status);
  return outcome;
}
