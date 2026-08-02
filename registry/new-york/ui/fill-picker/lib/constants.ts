/**
 * Shared alpha-transparency checkerboard backgrounds (inline SVG data URIs).
 * Two sizes on purpose: 12px tiles for large surfaces (alpha slider, preview,
 * gradient area/overlay), 8px for compact chips (swatches, stop rows,
 * contrast readout). Pair the SM variant with `backgroundSize: "8px 8px"`.
 */
export const CHECKERBOARD_LG =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><rect width='6' height='6' fill='%23ccc'/><rect x='6' y='6' width='6' height='6' fill='%23ccc'/></svg>\")";

export const CHECKERBOARD_SM =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'><rect width='4' height='4' fill='%23ccc'/><rect x='4' y='4' width='4' height='4' fill='%23ccc'/></svg>\")";

/**
 * Edge treatment for sample chips — swatches, gradient presets, the preview.
 *
 * These used to carry `border border-border`, which is wrong for a color
 * sample in two ways: an outer border steals a pixel from the color itself,
 * and because it paints a fixed opaque grey *outside* the sample it reads as
 * a halo — glaring around a dark chip on a light surface, and vanishing
 * entirely around a dark chip on a dark surface, which is exactly backwards
 * from where an edge is needed.
 *
 * Instead draw a translucent hairline *inside* the chip, as an `::after`
 * overlay so it sits above whatever fills the tile (the swatch's color span,
 * the preview's stacked fg/bg layers). Being translucent, it disappears into
 * a saturated or dark color — which is correct, since those already separate
 * from the surface — and only asserts itself on the pale samples that would
 * otherwise dissolve into it. The tone flips per theme so a near-white chip
 * stays defined on a light surface and a near-black chip on a dark one.
 *
 * Apply to a `relative` element; the chip's own `rounded-*` is inherited.
 */
export const SAMPLE_EDGE =
  "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] " +
  "after:shadow-[inset_0_0_0_1px_rgb(0_0_0/0.16)] dark:after:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.18)]";
