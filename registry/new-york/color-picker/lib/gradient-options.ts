import type {
  GradientInterp,
  GradientType,
  RadialSizeKeyword,
} from "./gradient";

/**
 * Option metadata shared by both switcher variants (classic and Base UI).
 * Living here — not copy-pasted into each tree — means a label or tooltip
 * edit can't desync the two product surfaces.
 */

export const GRADIENT_TYPE_OPTIONS: {
  value: GradientType;
  label: string;
}[] = [
  { value: "linear", label: "Linear" },
  { value: "radial", label: "Radial" },
  { value: "conic", label: "Conic" },
];

/**
 * Selectable interpolation spaces. Each maps to the CSS Color 4
 * `<gradient> in <space>` clause emitted by `formatGradient`. The
 * description is surfaced via the ⓘ icon next to each option, so users
 * hovering an option in the open menu see *why* they'd pick it.
 */
export const GRADIENT_INTERP_OPTIONS: {
  value: GradientInterp;
  label: string;
  description: string;
}[] = [
  {
    value: "oklch",
    label: "OKLCH",
    description:
      "Perceptually uniform polar space. Smooth hue arcs, no muddy mid-tones. Recommended default.",
  },
  {
    value: "oklab",
    label: "OKLab",
    description:
      "Perceptual but cartesian — a straight line through OK space. Smooth lightness, no hue rotation.",
  },
  {
    value: "srgb",
    label: "sRGB",
    description:
      "Legacy browser default. Mixes in gamma-encoded sRGB; often grays through the middle of two saturated colors.",
  },
  {
    value: "hsl",
    label: "HSL",
    description:
      "Walks the hue circle the shorter way between the two stops.",
  },
  {
    value: "hsl-longer",
    label: "HSL (longer hue)",
    description:
      "Walks the hue circle the longer way — produces a full rainbow sweep between two stops.",
  },
];

/**
 * The four CSS `<size>` keywords for radial gradients, each with a
 * one-sentence hover explanation surfaced via the ⓘ icon.
 *
 * https://developer.mozilla.org/en-US/docs/Web/CSS/gradient/radial-gradient#size
 */
export const RADIAL_SIZE_OPTIONS: {
  value: RadialSizeKeyword;
  description: string;
}[] = [
  {
    value: "closest-side",
    description:
      "Ends at the side of the box closest to the center (the shortest reachable edge).",
  },
  {
    value: "closest-corner",
    description:
      "Ends at the corner of the box closest to the center — passes through the nearest corner.",
  },
  {
    value: "farthest-side",
    description:
      "Ends at the side of the box farthest from the center (the longest reachable edge).",
  },
  {
    value: "farthest-corner",
    description:
      "Default. Ends at the corner of the box farthest from the center — gradient covers the entire box.",
  },
];
