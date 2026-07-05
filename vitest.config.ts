import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: [
      // More specific alias first: Vite tries object/array alias entries in
      // order and uses the first "startsWith" match, so "@/registry/*" must
      // be checked before the broader "@" -> src catch-all, or imports like
      // "@/registry/new-york/color-picker/parts/root" incorrectly resolve
      // under src/registry/... (which doesn't exist) instead of the actual
      // registry/ directory at the repo root.
      { find: "@/registry", replacement: path.resolve(__dirname, "./registry") },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
  },
});
