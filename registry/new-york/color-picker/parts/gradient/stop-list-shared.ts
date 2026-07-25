"use client";

/**
 * Behavior shared by the two StopList variants (classic and Base UI) so
 * keyboard/list logic can't drift between them: listbox arrow navigation,
 * focus retention on delete, and the insert-after-selected placement math.
 */

import * as React from "react";
import { sampleStopsAt } from "../../lib/gradient";
import type { OklchColor } from "../../lib/types";

/**
 * True when the key event originated inside a form control nested in the
 * option row (position/color inputs, popover trigger, remove button) rather
 * than on the option itself. List/row shortcuts must ignore those — e.g.
 * Backspace while editing the color text must edit text, not delete the
 * stop; ArrowUp/Down must nudge the numeric field, not move list focus.
 */
export function isEventFromRowControl(
  e: React.KeyboardEvent<HTMLElement>,
): boolean {
  return e.target !== e.currentTarget;
}

/**
 * Listbox keyboard navigation for the stop list container: ArrowUp/Down
 * move to the neighboring option, Home/End jump to the edges. Selection
 * follows focus — activation goes through `.click()` so the row's own
 * onClick (selectStop) runs.
 */
export function stopListKeyNav(e: React.KeyboardEvent<HTMLElement>): void {
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
  // Only navigate when the key originated on an option row itself. Keys
  // from nested controls (position/color inputs — where ArrowUp/Down mean
  // "nudge the value") must never be stolen by list navigation.
  if (!isOption(e.target)) return;
  const options = Array.from(
    e.currentTarget.querySelectorAll<HTMLElement>('[role="option"]'),
  );
  if (options.length === 0) return;
  const current = options.indexOf(document.activeElement as HTMLElement);
  let next: number;
  if (e.key === "Home") next = 0;
  else if (e.key === "End") next = options.length - 1;
  else {
    const delta = e.key === "ArrowDown" ? 1 : -1;
    next = Math.max(0, Math.min(Math.max(current, 0) + delta, options.length - 1));
  }
  e.preventDefault();
  options[next].focus();
  options[next].click();
}

function isOption(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement && target.getAttribute("role") === "option"
  );
}

/**
 * Move focus to the row's nearest option sibling. Call *before* removing
 * the stop — the neighbor's DOM node survives the re-render, so focus
 * stays in the list instead of being ejected to <body>.
 */
export function focusNeighborOption(row: HTMLElement): void {
  const neighbor =
    findOptionSibling(row, "nextElementSibling") ??
    findOptionSibling(row, "previousElementSibling");
  neighbor?.focus();
}

/**
 * Same intent as `focusNeighborOption`, but scans a container by selector
 * instead of walking siblings — the `<GradientPicker.Bar>` handles are
 * `role="slider"` elements that may each sit inside a popover anchor wrapper,
 * so they are not reliably DOM siblings of one another.
 *
 * Call *before* removing the focused element. Returns true when focus moved.
 */
export function focusNeighborIn(
  container: HTMLElement | null,
  current: HTMLElement,
  selector: string,
): boolean {
  if (!container) return false;
  const items = Array.from(container.querySelectorAll<HTMLElement>(selector));
  const idx = items.indexOf(current);
  if (idx === -1) return false;
  const neighbor = items[idx + 1] ?? items[idx - 1];
  if (!neighbor) return false;
  neighbor.focus();
  return true;
}

function findOptionSibling(
  el: HTMLElement,
  dir: "nextElementSibling" | "previousElementSibling",
): HTMLElement | null {
  let node = el[dir];
  while (node) {
    if (node instanceof HTMLElement && node.getAttribute("role") === "option") {
      return node;
    }
    node = node[dir];
  }
  return null;
}

/**
 * Placement for the "+ Add stop" row: insert immediately after the selected
 * stop — halfway to its next neighbor, or halfway back to the previous one
 * when the selected stop is last (so a quick add lands somewhere visible
 * instead of squeezing into a near-zero end gap). Samples the existing ramp
 * so the inserted color blends in.
 */
export function insertStopAfterSelected<
  T extends { id: string; position: number; color: OklchColor },
>(stops: readonly T[], selectedStopId: string | null): {
  position: number;
  color: OklchColor;
} {
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  // A stop-less gradient is degenerate but type-legal (`Gradient.stops` has no
  // non-empty constraint), so a controlled consumer can hand us one. There is
  // no anchor to place relative to — drop the first stop at 0 and let
  // sampleStopsAt supply its neutral fallback color.
  if (sorted.length === 0) return { position: 0, color: sampleStopsAt(sorted, 0) };
  const selectedIdx = sorted.findIndex((x) => x.id === selectedStopId);
  const anchorIdx = selectedIdx === -1 ? sorted.length - 1 : selectedIdx;
  const anchor = sorted[anchorIdx];
  const next = sorted[anchorIdx + 1];
  const prev = sorted[anchorIdx - 1];
  const position = next
    ? (anchor.position + next.position) / 2
    : prev
      ? (prev.position + anchor.position) / 2
      : Math.min(1, (anchor.position + 1) / 2);
  return { position, color: sampleStopsAt(sorted, position) };
}
