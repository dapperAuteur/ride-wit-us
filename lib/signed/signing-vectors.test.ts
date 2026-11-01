/**
 * The shared signing vectors against this repo's port of the signer and verifier. The vector file
 * is a byte-identical copy of centenarian-os `tests/fixtures/witus-signing-vectors.json` (the source
 * of truth); CentenarianOS runs the same cases against its own code, so a drift between the two
 * implementations fails a test in one repo instead of a production request.
 *
 * Do not edit the copy here: change the CentenarianOS file, then copy it over unchanged.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MAX_SKEW_SECONDS, signedGetBody, signedHeaders, witusSignature } from "./signature";
import { verifySignedRequest } from "./receiver";

interface VectorRequest {
  method: "GET" | "POST";
  path_and_query: string;
  body: string | null;
  signed_string: string | null;
  headers: Record<string, string>;
}

interface VectorCase {
  name: string;
  note: string;
  request: VectorRequest;
  receiver: { secret: string | null; expected_source: string; now: number };
  expect: { ok: true } | { ok: false; reason: string; status: number };
}

const file = JSON.parse(
  readFileSync(new URL("../../tests/fixtures/witus-signing-vectors.json", import.meta.url), "utf8")
) as { version: number; algorithm: { max_skew_seconds: number; reasons: string[] }; vectors: VectorCase[]; must_reject: VectorCase[] };

function signedOf(request: VectorRequest): string {
  if (request.method === "GET") return signedGetBody(new URL(request.path_and_query, "https://receiver.invalid"));
  return request.body ?? "";
}

function headers(h: Record<string, string>) {
  return new Headers(h);
}

function receive(c: VectorCase) {
  const result = verifySignedRequest({
    signed: signedOf(c.request),
    headers: headers(c.request.headers),
    secret: c.receiver.secret,
    expectedSource: c.receiver.expected_source,
    nowSeconds: c.receiver.now,
  });
  return result.ok ? { ok: true as const } : { ok: false as const, reason: result.reason, status: result.status };
}

describe("shared vector file", () => {
  it("is version 1 with the same 300-second window", () => {
    expect(file.version).toBe(1);
    expect(file.algorithm.max_skew_seconds).toBe(MAX_SKEW_SECONDS);
    expect(file.vectors.length).toBeGreaterThanOrEqual(4);
    expect(file.must_reject.length).toBeGreaterThanOrEqual(4);
  });
});

describe.each(file.vectors)("vector $name", (c) => {
  it("the signer reproduces the headers byte for byte", () => {
    const signed = signedOf(c.request);
    const ts = c.request.headers["X-Witus-Timestamp"];
    expect(c.request.signed_string).toBe(`${ts}.${signed}`);
    expect(c.request.headers["X-Witus-Signature"]).toBe(`sha256=${witusSignature(c.receiver.secret!, ts, signed)}`);
    const made = signedHeaders({ secret: c.receiver.secret!, source: c.request.headers["X-Witus-Source"], signed, nowSeconds: Number(ts) });
    expect(made["X-Witus-Source"]).toBe(c.request.headers["X-Witus-Source"]);
    expect(made["X-Witus-Timestamp"]).toBe(ts);
    expect(made["X-Witus-Signature"]).toBe(c.request.headers["X-Witus-Signature"]);
  });

  it("the verifier accepts it", () => {
    expect(receive(c)).toEqual({ ok: true });
  });
});

describe.each(file.must_reject)("must reject $name", (c) => {
  it(`answers ${"reason" in c.expect ? c.expect.reason : "ok"}`, () => {
    expect(receive(c)).toEqual(c.expect);
  });
});
