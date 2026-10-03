#!/usr/bin/env tsx
/**
 * Reads registry.json (the source manifest), bundles the contents of each
 * referenced file, and emits a per-component JSON file under public/r/.
 * Those URLs are what the shadcn CLI consumes:
 *   npx shadcn@latest add https://<host>/r/fill-picker.json
 *
 * Manifest note: `class-variance-authority` is declared on the two engine
 * items on purpose — shadcn's own `button`/`toggle` items use `cva` but omit
 * the package upstream, so a fresh consumer's `tsc` fails without it. Not a
 * redundant dep; don't "clean it up".
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

/* ------------------------------------------------------------------ *
 * Basename-collision lint (T8)
 *
 * The shadcn CLI runs a post-write import-fixup pass over every file it
 * just installed (`Bc`/`Yc` in the 4.16 bundle). For each ALIASED import
 * specifier it resolves an extension-less path, then picks a written file by matching the file
 * BASENAME, sorting candidates by extension index (`.tsx` BEFORE `.ts`)
 * and only then by whether the candidate shares the resolved directory
 * prefix. So a `.ts` module whose basename collides with any `.tsx`
 * module in the same registry silently loses its aliased importers to
 * that `.tsx` in a consumer project — while everything stays green here,
 * where TypeScript resolves the path honestly.
 *
 * Three exemptions are real, and this lint encodes exactly those:
 *   1. Relative specifiers — the pass's `Cn` gate skips them.
 *   2. `export … from` — the pass only walks import declarations.
 *   3. A shadowing barrel that re-exports the shadowed module's symbols:
 *      the redirect still happens, but it lands somewhere that has what
 *      the importer asked for. This is the mitigation in use today for
 *      `fill-picker-base/gradient.tsx`.
 * ------------------------------------------------------------------ */

export interface EmittedFile {
  path: string;
  content: string;
}

const TS_EXT = /\.tsx?$/;

/** `registry/new-york/ui/x/lib/y.ts` → `@/registry/new-york/ui/x/lib/y` */
function aliasSpecifierFor(filePath: string): string {
  return `@/${filePath.replace(TS_EXT, "")}`;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Names an import declaration pulls out of `spec`. `named` holds the
 * SOURCE names (left of `as`, which is what the redirect target must
 * export); `unnamed` flags default/namespace forms, which only a
 * `export * from` can cover.
 */
function importedBindings(
  content: string,
  spec: string,
): { named: string[]; unnamed: string[] } {
  const named: string[] = [];
  const unnamed: string[] = [];
  const re = new RegExp(
    String.raw`(?:^|[\s;}])import\s+(?:type\s+)?([^;]*?)\s+from\s*["']${escapeRe(spec)}["']`,
    "g",
  );
  for (const m of content.matchAll(re)) {
    const clause = m[1];
    if (/\*\s*as\s/.test(clause)) unnamed.push("namespace import");
    // A default binding is any bare identifier sitting outside the braces.
    const outsideBraces = clause.replace(/\{[^}]*\}/g, "").replace(/\*\s*as\s+[\w$]+/g, "");
    if (/[\w$]/.test(outsideBraces)) unnamed.push("default import");
    const braces = clause.match(/\{([^}]*)\}/);
    if (braces) {
      for (const raw of braces[1].split(",")) {
        const name = raw.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0].trim();
        if (name) named.push(name);
      }
    }
  }
  return { named, unnamed };
}

/**
 * Names `content` re-exports from `spec`, i.e. the names the module would
 * expose to an importer that got redirected here. `"*"` means
 * `export * from` — blanket coverage.
 */
function reexportedNames(content: string, spec: string): Set<string> {
  const out = new Set<string>();
  const re = new RegExp(
    String.raw`(?:^|[\s;}])export\s+(?:type\s+)?(\*|\{[^}]*\})\s*from\s*["']${escapeRe(spec)}["']`,
    "g",
  );
  for (const m of content.matchAll(re)) {
    if (m[1] === "*") {
      out.add("*");
      continue;
    }
    for (const raw of m[1].slice(1, -1).split(",")) {
      // `export { a as b }` exposes `b`; a redirected `import { b }` is
      // what has to be satisfied, so keep the RIGHT side.
      const parts = raw.trim().replace(/^type\s+/, "").split(/\s+as\s+/);
      const name = (parts[1] ?? parts[0]).trim();
      if (name) out.add(name);
    }
  }
  return out;
}

/**
 * Whole-manifest lint: across every emitted file, find basenames shared
 * by a `.ts` and a `.tsx` module, then report each aliased import into
 * the `.ts` side that the shadowing `.tsx` does not re-export.
 */
export function lintBasenameCollisions(files: EmittedFile[]): string[] {
  const stripped = new Map(
    files.map((f) => [f.path, stripComments(f.content)] as const),
  );

  const byBasename = new Map<string, string[]>();
  for (const f of files) {
    if (!TS_EXT.test(f.path)) continue;
    const base = path.basename(f.path).replace(TS_EXT, "");
    byBasename.set(base, [...(byBasename.get(base) ?? []), f.path]);
  }

  const errs: string[] = [];
  for (const [base, paths] of byBasename) {
    const tsPaths = paths.filter((p) => p.endsWith(".ts"));
    const tsxPaths = paths.filter((p) => p.endsWith(".tsx"));
    if (tsPaths.length === 0 || tsxPaths.length === 0) continue;

    for (const tsPath of tsPaths) {
      const spec = aliasSpecifierFor(tsPath);
      // Conservative when several `.tsx` could win the sort: every one of
      // them has to carry the symbols.
      const coverage = tsxPaths.map((p) => ({
        path: p,
        names: reexportedNames(stripped.get(p) ?? "", spec),
      }));
      const coversAll = coverage.every((c) => c.names.has("*"));
      const covers = (name: string) =>
        coverage.every((c) => c.names.has("*") || c.names.has(name));

      for (const f of files) {
        const { named, unnamed } = importedBindings(
          stripped.get(f.path) ?? "",
          spec,
        );
        const missing = [
          ...(coversAll ? [] : unnamed),
          ...named.filter((n) => !covers(n)),
        ];
        if (missing.length === 0) continue;
        errs.push(
          `basename collision "${base}": ${f.path} aliases ${tsPath}, but the CLI's ` +
            `import fixup redirects that to ${tsxPaths.join(" / ")} — which does not ` +
            `re-export ${[...new Set(missing)].join(", ")}. Use a relative import, or ` +
            `re-export the symbols from the shadowing barrel.`,
        );
      }
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
  // Deduped across items — a file can ship in more than one item, and the
  // basename-collision lint is a property of the whole emitted set.
  const emitted = new Map<string, EmittedFile>();

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
        emitted.set(f.path, { path: f.path, content });
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

  const collisionErrors = lintBasenameCollisions([...emitted.values()]);
  if (collisionErrors.length > 0) {
    throw new Error(
      `registry basename-collision lint failed:\n${collisionErrors.join("\n")}`,
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
