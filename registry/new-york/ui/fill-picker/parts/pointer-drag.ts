"use client";

import * as React from "react";

/**
 * Capture-based drag loop shared by every pointer surface: the color area,
 * the Radix channel sliders, the gradient overlay handles and the angle /
 * position pads. Besides the usual pointerup/pointercancel cleanup it
 * defends against the two ways a drag gets "stuck" chasing the cursor:
 *
 *  - a move arriving with no buttons pressed (the release happened where
 *    we couldn't see it — e.g. capture silently dropped, button released
 *    during an OS gesture) ends the drag instead of dragging on;
 *  - `lostpointercapture` (window blur / cmd-tab mid-drag revokes capture
 *    without any pointerup) tears the listeners down immediately.
 */
export function trackPointerDrag(
  target: HTMLElement,
  pointerId: number,
  onMove: (ev: PointerEvent) => void,
): void {
  try {
    target.setPointerCapture(pointerId);
  } catch {
    // inactive pointer id — the drag still works while the pointer stays
    // over the target; the buttons check below handles missed releases.
  }
  const move = (ev: PointerEvent) => {
    // Only the dragging pointer steers or ends the gesture — a second
    // touch point wandering over the captured element must not.
    if (ev.pointerId !== pointerId) return;
    if (ev.buttons === 0) {
      end(ev);
      return;
    }
    onMove(ev);
  };
  const end = (ev?: Event) => {
    if (ev instanceof PointerEvent && ev.pointerId !== pointerId) return;
    if (ev instanceof PointerEvent) {
      try {
        target.releasePointerCapture(ev.pointerId);
      } catch {
        // pointer may already be released on cancel
      }
    }
    target.removeEventListener("pointermove", move);
    target.removeEventListener("pointerup", end);
    target.removeEventListener("pointercancel", end);
    target.removeEventListener("lostpointercapture", end);
  };
  target.addEventListener("pointermove", move);
  target.addEventListener("pointerup", end);
  target.addEventListener("pointercancel", end);
  target.addEventListener("lostpointercapture", end);
}

/**
 * Ref that always holds the latest committed `value`. `trackPointerDrag`
 * binds its move listener once at pointerdown, so a handler that closes
 * over render state (the current color, mode, gamut) must be read through
 * this ref — otherwise every move of the drag would act on the snapshot
 * taken when the pointer went down.
 */
export function useLatest<T>(value: T): React.RefObject<T> {
  const ref = React.useRef(value);
  React.useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}

/**
 * `onPointerDown` for a capture-based surface: applies the press position
 * immediately, then follows the drag with `trackPointerDrag`. `onPoint`
 * may change every render; moves always reach the latest one.
 */
export function usePointerDrag(
  onPoint: (clientX: number, clientY: number) => void,
): (e: React.PointerEvent<HTMLElement>) => void {
  const latest = useLatest(onPoint);
  return React.useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      latest.current(e.clientX, e.clientY);
      trackPointerDrag(e.currentTarget, e.pointerId, (ev) =>
        latest.current(ev.clientX, ev.clientY),
      );
    },
    [latest],
  );
}
