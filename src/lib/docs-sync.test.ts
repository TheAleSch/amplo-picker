/**
 * The docs exist twice: the HTML page (src/app/docs/full-docs.tsx) and the
 * agent markdown (DOCS_MARKDOWN, served at /docs.md and /llms-full.txt).
 * The shared tables live in ./docs-api; this test pins everything else
 * that names a real API to the actual exports, so neither copy can drift.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import * as colorBarrel from "@/registry/new-york/ui/fill-picker/color-picker";
import { ColorPicker, GradientPicker, FillPicker } from "@/registry/new-york/ui/fill-picker/fill-picker";
import {
  ColorPickerBase,
  GradientPickerBase,
  FillPickerBase,
} from "@/registry/new-york/ui/fill-picker-base/fill";
import { useColorPicker } from "@/registry/new-york/ui/fill-picker/hooks/use-color-picker";
import { HOOK_CODE, UTILS_CODE } from "./docs-api";
import { DOCS_MARKDOWN } from "./docs-markdown";

// The HTML page renders its own source plus the shared tables in docs-api.
const HTML_DOCS = ["../app/docs/full-docs.tsx", "./docs-api.ts"]
  .map((f) => readFileSync(join(__dirname, f), "utf8"))
  .join("\n");
const COPIES = { "full-docs.tsx": HTML_DOCS, DOCS_MARKDOWN } as const;

const NAMESPACES = { ColorPicker, GradientPicker, FillPicker } as const;

/** Identifiers listed one per line in a `{ a, // … }` snippet block. */
function listedNames(snippet: string): string[] {
  return [...snippet.matchAll(/^ {2}(\w+),/gm)].map((m) => m[1]);
}

describe("docs stay in sync with the API", () => {
  it("the hook snippet lists exactly the fields useColorPicker returns", () => {
    const { result } = renderHook(() => useColorPicker());
    expect(listedNames(HOOK_CODE).sort()).toEqual(Object.keys(result.current).sort());
  });

  it("every utility in the snippet is a real barrel export", () => {
    const names = listedNames(UTILS_CODE);
    expect(names.length).toBeGreaterThan(0);
    for (const n of names) expect(colorBarrel, n).toHaveProperty(n);
  });

  it("the Base UI and Radix namespaces expose the same parts", () => {
    expect(Object.keys(ColorPickerBase).sort()).toEqual(Object.keys(ColorPicker).sort());
    expect(Object.keys(GradientPickerBase).sort()).toEqual(Object.keys(GradientPicker).sort());
    expect(Object.keys(FillPickerBase).sort()).toEqual(Object.keys(FillPicker).sort());
  });

  for (const [copy, text] of Object.entries(COPIES)) {
    for (const [ns, parts] of Object.entries(NAMESPACES)) {
      it(`${copy} documents every ${ns} part`, () => {
        const missing = Object.keys(parts).filter((p) => !text.includes(`${ns}.${p}`));
        expect(missing).toEqual([]);
      });

      it(`${copy} names no ${ns} part that doesn't exist`, () => {
        const named = new Set(
          [...text.matchAll(new RegExp(`\\b${ns}\\.([A-Z]\\w*)`, "g"))].map((m) => m[1]),
        );
        const unknown = [...named].filter((p) => !(p in parts));
        expect(unknown).toEqual([]);
      });
    }
  }
});
