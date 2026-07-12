import type { OklchColor } from "./types";

/** Default swatch presets shared by both Swatches variants. */
export const DEFAULT_SWATCH_PRESETS = [
  "oklch(0.95 0 0)",
  "oklch(0.75 0 0)",
  "oklch(0.5 0 0)",
  "oklch(0.25 0 0)",
  "oklch(0.05 0 0)",
  "oklch(0.7 0.18 30)",
  "oklch(0.7 0.18 90)",
  "oklch(0.7 0.18 150)",
  "oklch(0.7 0.18 210)",
  "oklch(0.7 0.18 270)",
];

/**
 * Compare a preset to the current color in canonical OKLCH form so the
 * active ring shows regardless of the active output format (a hex-string
 * comparison would never match when the format is anything but `hex`).
 * Achromatic colors have an undefined hue; the hue check is skipped when
 * either side has near-zero chroma so swatches like `oklch(0.5 0 0)` match
 * the current gray regardless of its drifted hue.
 */
export function isSameSwatchColor(
  preset: OklchColor,
  color: OklchColor,
): boolean {
  if (Math.abs(preset.l - color.l) >= 1e-3) return false;
  if (Math.abs(preset.c - color.c) >= 1e-3) return false;
  if (Math.abs(preset.alpha - color.alpha) >= 1e-3) return false;
  if (preset.c < 1e-3 || color.c < 1e-3) return true;
  const d = (((preset.h - color.h) % 360) + 360) % 360;
  const wrapped = d > 180 ? 360 - d : d;
  return wrapped < 0.1;
}
