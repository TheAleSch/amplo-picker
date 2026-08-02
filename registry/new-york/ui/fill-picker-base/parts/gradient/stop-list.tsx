"use client";

// Re-export, not a fork.
//
// The original StopList touches no Radix primitive: its rows are plain markup,
// its keyboard/selection/insert logic already lives in the shared
// `stop-list-shared` helpers, its stop editor is a slot injected by whichever
// barrel mounted the tree (`useGradientStopEditor` — so under this variant the
// rows open ./stop-editor, the Base UI one), and the only field parts it uses
// — FieldInput / FieldInputGroup / FieldShell / FieldSuffix — are re-exported
// verbatim from the original by this variant's own `./field`. It never touches
// `FieldSelect`, the one field part that genuinely differs between variants.
//
// So the fork was a byte-for-byte copy modulo import paths, and its only
// effect was the risk of the two lists' keyboard behaviour drifting apart.
//
// The file is kept at this path (rather than dropped in favour of importing
// the original directly in `gradient.tsx`) so anyone deep-importing
// `.../fill-picker-base/parts/gradient/stop-list` keeps resolving.
export {
  StopList,
  type StopListProps,
} from "@/registry/new-york/ui/fill-picker/parts/gradient/stop-list";
