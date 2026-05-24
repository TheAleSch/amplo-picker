# Deferred work

## Midpoint hint UI

CSS gradient color hints (`linear-gradient(red, 30%, blue)`) reshape the
interpolation curve between two stops. The data model and hook already
support them — `GradientStop.hint?: number` in `lib/gradient.ts`,
`setStopHint(id, hint | undefined)` in `hooks/use-gradient-picker.ts`,
emitted correctly by `formatStops`. **No UI surfaces it.**

### Why deferred

Two prototypes shipped + reverted (`f6a249c`..`f65ff96`):

1. **Diamond on Bar** — visually noisy (N stops → N-1 diamonds), read
   as a second kind of stop, drag math fiddly near neighbors.
2. **Numeric % row in StopList** — clean but more UI than the feature
   currently earns. Designers rarely reach for it.

### When to revisit

Pick this up when at least one of these is true:

- A user asks for non-linear easing between stops.
- Easing presets (ease-in, ease-out, custom bezier) land — hints are
  the natural shape for the per-segment control.
- A "compact gradient string" benchmark matters (hints are 1 token vs.
  3-5 stops for a sampled equivalent).

### Design constraints when revisiting

- Hint position is in **authored space** (0..1 on the CSS gradient
  line), same as stop positions. Clamp to `(prev + ε, next - ε)`.
- For positioned linears (`start`/`end` set), the UI value must round-
  trip through `projectStopPosition` / `reverseProjectStopPosition` so
  it matches what Bar shows.
- Auto state (hint undefined) ≠ hint at geometric midpoint. CSS treats
  them differently in some interp modes — never silently materialize
  a hint when the user hasn't asked for one.
- Consider an alternative: per-segment easing curve picker (cubic
  bezier handles) that maps to one or more hints. Richer than a
  single-point hint, same data layer.
