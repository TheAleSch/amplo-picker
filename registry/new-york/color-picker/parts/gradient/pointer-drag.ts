"use client";

/**
 * Capture-based drag loop shared by the overlay handles and the angle /
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
    if (ev.buttons === 0) {
      end(ev);
      return;
    }
    onMove(ev);
  };
  const end = (ev?: Event) => {
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
