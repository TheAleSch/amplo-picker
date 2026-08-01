#!/usr/bin/env bash
# D6 e2e matrix (hermetic). Serves public/r on localhost and resolves ALL
# registryDependencies against it via REGISTRY_BASE_URL (see build-registry).
set -euo pipefail
PORT=8998; BASE=/tmp/amplo-e2e
LAYOUTS=(${1:-standard renderer}); STYLES=(${2:-radix base})

REGISTRY_BASE_URL="http://localhost:$PORT" pnpm registry:build
( cd public && python3 -m http.server "$PORT" >/dev/null 2>&1 & echo $! > /tmp/amplo-e2e-server.pid )
trap 'kill "$(cat /tmp/amplo-e2e-server.pid)" 2>/dev/null || true' EXIT
sleep 1

fail=0
for layout in "${LAYOUTS[@]}"; do for style in "${STYLES[@]}"; do
  dir="$BASE/$layout-$style"; rm -rf "$dir"; mkdir -p "$dir"
  pnpm tsx scripts/e2e/consumer-fixtures.ts "$dir" "$layout" "$style"
  if [ "$style" = radix ]; then
    items=("http://localhost:$PORT/r/color-picker-radix.json" "http://localhost:$PORT/r/gradient-picker-radix.json")
  else
    items=("http://localhost:$PORT/r/fill-picker.json")
  fi
  ( cd "$dir" && pnpm add -s clsx tailwind-merge tailwindcss >/dev/null && pnpm install -s >/dev/null \
    && for it in "${items[@]}"; do npx --yes shadcn@latest add "$it" --yes --overwrite; done )
  src_root=$([ "$layout" = renderer ] && echo "src/renderer" || echo "src")
  ui="$dir/$src_root/components/ui"
  # A1 (complaint 1): files land under the CONSUMER'S alias root.
  [ -f "$ui/fill-picker/lib/color.ts" ] || { echo "FAIL[$layout/$style] A1: no $ui/fill-picker/lib/color.ts"; find "$dir/src" -name color.ts | head -3; fail=1; continue; }
  # A2 (D3, exact files not substring greps — F5): base installs contain none
  # of the Radix shell files; radix installs contain all of them.
  radix_shells=("fill-picker/parts/format-switcher.tsx" "fill-picker/parts/channel-input.tsx" "fill-picker/parts/gradient/stop-editor-popover.tsx" "fill-picker/parts/gradient/interp-switcher.tsx")
  for f in "${radix_shells[@]}"; do
    if [ "$style" = base ] && [ -f "$ui/$f" ]; then echo "FAIL[$layout/$style] A2: radix shell $f installed in base consumer"; fail=1; fi
    if [ "$style" = radix ] && [ ! -f "$ui/$f" ]; then echo "FAIL[$layout/$style] A2: radix shell $f missing in radix consumer"; fail=1; fi
  done
  # A3 (complaint 2): installed code typechecks as-is.
  ( cd "$dir" && npx tsc --noEmit ) || { echo "FAIL[$layout/$style] A3: consumer tsc failed"; fail=1; continue; }
  echo "PASS[$layout/$style]"
done; done
exit "$fail"
