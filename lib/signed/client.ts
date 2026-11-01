/**
 * The sending half: signed GET and POST to a sibling app. Server-only callers (pages, actions,
 * cron routes); the secret never reaches the browser.
 *
 * The bytes signed are the bytes sent. A POST body is serialized once and never re-serialized; a
 * GET signs the path plus query of the exact URL fetched (built once with URLSearchParams).
 * Every call has a timeout and never throws: it returns a result with a short reason, which never
 * contains the secret, the signature or the body.
 */
import { signedGetBody, signedHeaders } from "./signature";

export type FetchLike = (
  input: string,
  init: { method: string; headers: Record<string, string>; body?: string; signal?: AbortSignal; cache?: RequestCache }
) => Promise<{ ok: boolean; status: number; text(): Promise<string>; headers?: { get(name: string): string | null } }>;

export interface SignedResult {
  ok: boolean;
  /** HTTP status, or 0 when no answer came back (timeout, network error). */
  status: number;
  /** The parsed JSON answer, or null. */
  body: unknown;
  /** Set when ok is false: http_<status>, timeout, network_error. */
  error?: string;
  /** The Retry-After header, when the answer had one (429). */
  retryAfter?: string | null;
}

export interface SignedCallOptions {
  secret: string;
  source: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  nowSeconds?: number;
}

const DEFAULT_TIMEOUT_MS = 8000;

/** `base` + `path` + `params` (empty and null values left out), as one URL. */
export function buildUrl(base: string, path: string, params: Record<string, string | number | null | undefined> = {}): URL {
  const url = new URL(path, base.endsWith("/") ? base : `${base}/`);
  // A base with a path prefix (https://host/prefix) keeps it: `path` is resolved relative to it.
  if (path.startsWith("/")) url.pathname = `${new URL(base).pathname.replace(/\/$/, "")}${path}`;
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    url.searchParams.set(key, String(value));
  }
  return url;
}

async function call(url: URL, method: "GET" | "POST", signed: string, body: string | undefined, options: SignedCallOptions): Promise<SignedResult> {
  const headers = signedHeaders({ secret: options.secret, source: options.source, signed, nowSeconds: options.nowSeconds });
  const doFetch = options.fetchImpl ?? (fetch as unknown as FetchLike);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const res = await doFetch(url.toString(), { method, headers: { ...headers }, body, signal: controller.signal, cache: "no-store" });
    const text = await res.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }
    if (!res.ok) {
      return { ok: false, status: res.status, body: parsed, error: `http_${res.status}`, retryAfter: res.headers?.get("retry-after") ?? null };
    }
    return { ok: true, status: res.status, body: parsed };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return { ok: false, status: 0, body: null, error: aborted ? "timeout" : "network_error" };
  } finally {
    clearTimeout(timer);
  }
}

/** Signed GET of `url`, signing its path and query exactly as fetched. */
export function getSigned(url: URL, options: SignedCallOptions): Promise<SignedResult> {
  return call(url, "GET", signedGetBody(url), undefined, options);
}

/** Signed POST of `payload` as JSON to `url`, signing the exact bytes sent. */
export function postSigned(url: URL, payload: unknown, options: SignedCallOptions): Promise<SignedResult> {
  const raw = JSON.stringify(payload);
  return call(url, "POST", raw, raw, options);
}
