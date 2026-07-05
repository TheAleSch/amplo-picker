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
