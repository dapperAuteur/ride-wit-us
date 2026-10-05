"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { otherSystem, type UnitSystem } from "@/lib/units/convert";

interface UnitsContextValue {
  /** The system measurements on this page are shown in right now. */
  system: UnitSystem;
  /** The user's saved default from settings. The toggle never changes it. */
  defaultSystem: UnitSystem;
  isShowingOther: boolean;
  toggle: () => void;
}

const UnitsContext = createContext<UnitsContextValue | null>(null);

/**
 * Per-page units state (PRD §5.9). Wrap a page's content; `defaultSystem` comes from the server's
 * read of user_settings. The toggle is page-local state: reload or navigate and the page is back
 * on the saved default, which is the point. Changing the default is the settings page's job.
 */
export function UnitsProvider({ defaultSystem, children }: { defaultSystem: UnitSystem; children: ReactNode }) {
  const [isShowingOther, setIsShowingOther] = useState(false);
  const value = useMemo<UnitsContextValue>(
    () => ({
      system: isShowingOther ? otherSystem(defaultSystem) : defaultSystem,
      defaultSystem,
      isShowingOther,
      toggle: () => setIsShowingOther((v) => !v),
    }),
    [defaultSystem, isShowingOther]
  );
  return <UnitsContext.Provider value={value}>{children}</UnitsContext.Provider>;
}

export function useUnits(): UnitsContextValue {
  const ctx = useContext(UnitsContext);
  if (!ctx) throw new Error("useUnits must be used inside <UnitsProvider>");
  return ctx;
}
