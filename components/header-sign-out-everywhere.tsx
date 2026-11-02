"use client";

import { useId } from "react";
import { useSignOutEverywhere } from "@/components/sign-out-button";
import { SIGN_OUT_EVERYWHERE_HELP, SIGN_OUT_EVERYWHERE_LABEL, SIGNING_OUT_LABEL } from "@/lib/witus-sso";

/**
 * "Sign out of WitUS everywhere" in the header, beside "Sign out" (BAM, 2026-11-01). Same click as
 * the account strip's control at the foot of every app page (`useSignOutEverywhere`: this app's
 * session first, then the WitUS session at the IdP). Styled by the header theme that renders it.
 *
 * The help text stays attached to the button (aria-describedby) at every size; `showHelp` decides
 * whether it is also visible. The bar has no room for it, the phone Menu does.
 */
export function HeaderSignOutEverywhere({
  endSessionUrl,
  className,
  showHelp = false,
  helpClassName,
}: {
  endSessionUrl: string;
  className: string;
  showHelp?: boolean;
  helpClassName?: string;
}) {
  const { pending, start } = useSignOutEverywhere(endSessionUrl);
  const helpId = useId();

  return (
    <>
      <button type="button" disabled={pending} aria-describedby={helpId} onClick={start} className={className}>
        {pending ? SIGNING_OUT_LABEL : SIGN_OUT_EVERYWHERE_LABEL}
      </button>
      <span id={helpId} className={showHelp ? helpClassName : "sr-only"}>
        {SIGN_OUT_EVERYWHERE_HELP}
      </span>
    </>
  );
}
