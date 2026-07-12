"use client";

import * as React from "react";

/**
 * Debounced screen-reader announcements for 2D controls (`role="application"`
 * pads/handles) that have no native value semantics. Render `liveText` inside
 * a visually hidden `aria-live="polite"` element and call `announce` after
 * each keyboard-driven change; the debounce keeps held-down arrow keys from
 * flooding the SR queue.
 */
export function useLiveAnnounce(
  delayMs = 150,
): [string, (text: string) => void] {
  const [liveText, setLiveText] = React.useState("");
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const announce = React.useCallback(
    (text: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setLiveText(text), delayMs);
    },
    [delayMs],
  );
  React.useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );
  return [liveText, announce];
}
