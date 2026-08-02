#!/usr/bin/env tsx
/**
 * Reads registry.json (the source manifest), bundles the contents of each
 * referenced file, and emits a per-component JSON file under public/r/.
 * Those URLs are what the shadcn CLI consumes:
 *   npx shadcn@latest add https://<host>/r/fill-picker.json
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(process.cwd());
const MANIFEST = path.join(ROOT, "registry.json");
const OUT_DIR = path.join(ROOT, "public", "r");

/**
 * Registry item names become output filenames (`public/r/<name>.json`), so
 * they must never carry path separators or traversal segments — a malicious
 * manifest could otherwise overwrite arbitrary repo files at build time.
 */
export function assertSafeItemName(name: string): void {
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(name) || name.includes("..")) {
    throw new Error(`registry item name is not a safe filename: ${name}`);
  }
}

/**
 * Resolve a manifest-relative file path and assert it stays inside `root`
 * — both lexically (no `..` escape) and physically (realpath, so a symlink
 * inside the tree can't pull outside file contents into published JSON).
 */
export function resolveContained(root: string, rel: string): string {
  const resolved = path.resolve(root, rel);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error(`registry.json path escapes repo root: ${rel}`);
  }
  const realRoot = fs.realpathSync(root);
  const real = fs.realpathSync(resolved);
  if (real !== realRoot && !real.startsWith(realRoot + path.sep)) {
    throw new Error(`registry.json path escapes repo root via symlink: ${rel}`);
  }
  return real;
}

const UI_TREE_PREFIX = "registry/new-york/ui/";

/**
 * Once a source file lives under the ui tree (`registry/new-york/ui/<dir>/
 * <rest>`), its consumer-side `target` is mechanically derivable — no need
 * to spell it out per-file in registry.json. Paths outside that tree (e.g.
 * the pre-restructure `color-picker/` source root) still require an
 * explicit `target` in the manifest.
 */
export function deriveTarget(filePath: string): string {
  if (!filePath.startsWith(UI_TREE_PREFIX)) {
    throw new Error(
      `cannot derive target: ${filePath} is not under the ui tree (${UI_TREE_PREFIX})`,
    );
  }
  // Alias-NAME prefix (`@ui/…`), not `@/…`: the CLI only alias-resolves
  // targets matching `@<alias>/<rest>` (shadcn >= 4.7.0, resolved against
  // `components.json`'s `aliases.ui`). `@/`-prefixed forms fail that regex
  // and are installed literally, landing at `<cwd>/src/@/components/ui/…`.
  return `@ui/${filePath.slice(UI_TREE_PREFIX.length)}`;
}

/**
 * `*-engine` items are meant to stay dialect-agnostic (usable from both the
 * Radix and Base UI trees), so they may only import the small set of UI
 * primitives whose API is stable across dialects.
 */
export const ENGINE_UI_ALLOWLIST = ["button", "toggle", "input"];

const PROD_BASE = "https://amplo.ale.design";

/** Strip //, /* *​/ and JSX {/* *​/} comments so prose mentions don't trip the lint. */
export function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/**
 * Scan a single engine-item file's comment-stripped content for imports of
 * non-allowlisted `@/components/ui/*` primitives. Returns one message per
 * offending import (empty array when clean) rather than throwing directly,
 * so callers can accumulate errors across an item's files and report them
 * all together.
 */
export function lintEngineFile(
  itemName: string,
  filePath: string,
  content: string,
): string[] {
  const errs: string[] = [];
  for (const m of stripComments(content).matchAll(
    /@\/components\/ui\/([a-z-]+)/g,
  )) {
    if (!ENGINE_UI_ALLOWLIST.includes(m[1])) {
      errs.push(
        `${itemName}: ${filePath} imports @/components/ui/${m[1]} (engine allowlist: ${ENGINE_UI_ALLOWLIST.join(", ")})`,
      );
    }
  }
  return errs;
}

interface RegistryFile {
  path: string;
  type: string;
  target?: string;
}
interface RegistryItem {
  name: string;
  type: string;
  title?: string;
  description?: string;
  version?: string;
  categories?: string[];
  dependencies?: string[];
  registryDependencies?: string[];
  files: RegistryFile[];
  cssVars?: unknown;
  tailwind?: unknown;
}
interface Manifest {
  name: string;
  homepage?: string;
  items: RegistryItem[];
}

/**
 * The build itself, parameterized on its paths so it can run against a
 * fixture tree under test. `main()` is the thin production binding.
 *
 * Set `quiet` to suppress the per-file progress log (tests only).
 */
export function buildRegistry(opts: {
  root: string;
  manifest: string;
  outDir: string;
  quiet?: boolean;
  baseUrl?: string;
}) {
  const {
    root: ROOT,
    manifest: MANIFEST,
    outDir: OUT_DIR,
    quiet,
    baseUrl = process.env.REGISTRY_BASE_URL,
  } = opts;
  const log = (msg: string) => {
    if (!quiet) console.log(msg);
  };
  const rewriteBase = (deps: string[]) =>
    baseUrl ? deps.map((d) => d.replaceAll(PROD_BASE, baseUrl)) : deps;
  const manifest: Manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const engineLintErrors: string[] = [];

  for (const item of manifest.items) {
    assertSafeItemName(item.name);
    const isEngine = item.name.endsWith("-engine");
    const out = {
      $schema: "https://ui.shadcn.com/schema/registry-item.json",
      name: item.name,
      type: item.type,
      title: item.title,
      description: item.description,
      version: item.version,
      categories: item.categories,
      dependencies: item.dependencies ?? [],
      registryDependencies: rewriteBase(item.registryDependencies ?? []),
      files: item.files.map((f) => {
        const content = fs.readFileSync(resolveContained(ROOT, f.path), "utf8");
        if (isEngine) {
          engineLintErrors.push(...lintEngineFile(item.name, f.path, content));
        }
        return {
          path: f.path,
          type: f.type,
          target: f.target ?? deriveTarget(f.path),
          content,
        };
      }),
    };
    const outPath = path.join(OUT_DIR, `${item.name}.json`);
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");

    // Legacy alias: `fill-picker-base` was the Base UI bundle's name before
    // the registry went Base-UI-first (plain names = Base UI). Keep the old
    // URL working for anyone who copied it.
    if (item.name === "fill-picker") {
      const aliasPath = path.join(OUT_DIR, "fill-picker-base.json");
      fs.writeFileSync(aliasPath, JSON.stringify(out, null, 2) + "\n");
      log(`✓ wrote public/r/fill-picker-base.json (legacy alias of fill-picker)`);
    }
    log(`✓ wrote ${path.relative(ROOT, outPath)} (${out.files.length} files)`);
  }

  if (engineLintErrors.length > 0) {
    throw new Error(
      `engine dialect-agnosticism lint failed:\n${engineLintErrors.join("\n")}`,
    );
  }

  const registryPath = path.join(OUT_DIR, "registry.json");
  fs.writeFileSync(
    registryPath,
    JSON.stringify(
      {
        $schema: "https://ui.shadcn.com/schema/registry.json",
        name: manifest.name,
        homepage: manifest.homepage,
        items: manifest.items.map((i) => ({
          name: i.name,
          type: i.type,
          title: i.title,
          description: i.description,
          version: i.version,
          categories: i.categories,
          dependencies: i.dependencies ?? [],
          registryDependencies: rewriteBase(i.registryDependencies ?? []),
          files: i.files.map((f) => ({
            path: f.path,
            type: f.type,
            target: f.target ?? deriveTarget(f.path),
          })),
        })),
      },
      null,
      2,
    ) + "\n",
  );
  log(`✓ wrote ${path.relative(ROOT, registryPath)}`);
}

function main() {
  buildRegistry({ root: ROOT, manifest: MANIFEST, outDir: OUT_DIR });
}

// Only run when executed directly (pnpm registry:build), not when the
// build function / containment helpers are imported by tests.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main();
}
