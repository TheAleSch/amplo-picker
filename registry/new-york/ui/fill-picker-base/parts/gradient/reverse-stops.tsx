"use client";

// Re-export, not a fork.
//
// This part is a plain shadcn `<Button>` over `ctx.reverseStops` with zero
// Radix-specific surface — since the shared primitives moved to Base UI
// (`useRender`, no Radix `Slot`), the original works unchanged in this
// variant. Forking it bought nothing and risked the two copies drifting.
//
// The file is kept at this path (rather than dropped in favour of importing
// the original directly in `gradient.tsx`) so anyone deep-importing
// `.../fill-picker-base/parts/gradient/reverse-stops` keeps resolving.
export { ReverseStops } from "@/registry/new-york/ui/fill-picker/parts/gradient/reverse-stops";
