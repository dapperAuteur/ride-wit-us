/**
 * What a person reads when a CentenarianOS call did not return data. Plain words, one next step.
 * Pure, so the copy is tested (contract §2: 404 unknown_subject shows "connect CentenarianOS").
 */
import type { CentosProblem } from "./client";

export interface ProblemCopy {
  title: string;
  body: string;
}

export function centosProblemCopy(problem: CentosProblem, retryAfterSeconds?: number): ProblemCopy {
  switch (problem) {
    case "unknown_subject":
      return {
        title: "Connect CentenarianOS",
        body: "Your vendors live in CentenarianOS. Sign in to CentenarianOS once with your WitUS account, then come back and they will show up here.",
      };
    case "not_configured":
      return {
        title: "Vendors from CentenarianOS aren't switched on yet",
        body: "This site isn't connected to CentenarianOS yet. Your trips are unaffected; vendors appear once the connection is set up.",
      };
    case "not_found":
      return { title: "Vendor not found", body: "This vendor isn't in your CentenarianOS contacts. It may have been deleted there." };
    case "timeout":
      return { title: "CentenarianOS didn't answer in time", body: "Try again in a moment." };
    case "rate_limited":
      return {
        title: "Too soon",
        body: retryAfterSeconds ? `Try again in ${Math.ceil(retryAfterSeconds / 60)} minute${retryAfterSeconds > 60 ? "s" : ""}.` : "Try again in a few minutes.",
      };
    case "unauthorized":
      return {
        title: "CentenarianOS refused the request",
        body: "The two apps' connection settings don't match. Nothing is wrong with your account; the site owner has been told in the logs.",
      };
    case "bad_request":
    case "invalid_response":
    case "unavailable":
    default:
      return { title: "CentenarianOS isn't reachable right now", body: "Try again in a few minutes." };
  }
}
