#!/usr/bin/env tsx
/**
 * Computes the transitive import closure of the Base UI tree
 * (registry/new-york/ui/fill-picker-base) into the shared tree
 * (registry/new-york/ui/fill-picker).
 *
 * The result answers exactly one question: which shared-tree files must a
 * consumer receive when they install a Base UI item? Those files are the
 * *-engine item membership candidates; shared-tree files outside the closure
 * are Radix-shell-only and stay in the *-radix items.
 *
 * Usage: pnpm tsx scripts/engine-closure.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";

const SHARED = "registry/new-york/ui/fill-picker";
const BASE = "registry/new-york/ui/fill-picker-base";
const ALIAS = "@/registry/new-york/ui/fill-picker/";

/**
 * Boundary-safe membership test. `fill-picker-base` shares a string prefix
 * with `fill-picker`, so a naive startsWith would swallow the whole base
 * tree into the "shared" side; anchor on a path separator and subtract the
 * base tree explicitly.
 */
const inShared = (p: string) => {
  const n = path.normalize(p);
  return (
    (n === SHARED || n.startsWith(SHARED + path.sep)) &&
    !(n === BASE || n.startsWith(BASE + path.sep))
  );
};

const isTest = (p: string) => /\.test\.tsx?$/.test(p);
const isSource = (p: string) => /\.tsx?$/.test(p) && !isTest(p);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (isSource(full)) out.push(full);
  }
  return out;
}

/**
 * Strip block and line comments before scanning for imports — doc comments
 * in this tree contain prose like `derived from "the draft"`, which a bare
 * regex would otherwise read as a module specifier.
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Every `from "…"` / `import("…")` specifier in a file, in source order. */
function specifiers(raw: string): string[] {
  const content = stripComments(raw);
  const specs: string[] = [];
  for (const m of content.matchAll(/from\s+["']([^"']+)["']/g)) specs.push(m[1]);
  for (const m of content.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g))
    specs.push(m[1]);
  return specs;
}

/** Add the extension back onto an extensionless module path. */
function resolveModule(base: string): string | null {
  for (const cand of [
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ]) {
    if (fs.existsSync(cand)) return cand;
  }
  return null;
}

/**
 * Resolve one import specifier to a repo-relative source path, or null when
 * it leaves the registry trees (bare packages, `@/lib/utils`, `@/components/ui/*`).
 */
function resolveSpec(spec: string, fromFile: string): string | null {
  if (spec.startsWith(ALIAS)) {
    return resolveModule(path.join(SHARED, spec.slice(ALIAS.length)));
  }
  if (spec.startsWith(".")) {
    return resolveModule(path.join(path.dirname(fromFile), spec));
  }
  return null;
}

function main() {
  const seeds = walk(BASE);
  const queue = [...seeds];
  const visited = new Set(seeds);
  /** shared-tree file -> importers that pulled it in */
  const closure = new Map<string, Set<string>>();

  while (queue.length > 0) {
    const file = queue.shift()!;
    const content = fs.readFileSync(file, "utf8");
    for (const spec of specifiers(content)) {
      const resolved = resolveSpec(spec, file);
      if (!resolved) continue;
      const rel = path.normalize(resolved);
      if (inShared(rel)) {
        if (!closure.has(rel)) closure.set(rel, new Set());
        closure.get(rel)!.add(path.normalize(file));
      }
      if (!visited.has(rel)) {
        visited.add(rel);
        queue.push(rel);
      }
    }
  }

  const sorted = [...closure.keys()].sort();
  console.log(`# base seeds: ${seeds.length} non-test source files under ${BASE}`);
  console.log(`# shared-tree closure: ${sorted.length} files\n`);
  for (const f of sorted) console.log(f);

  const all = walk(SHARED).map((f) => path.normalize(f)).sort();
  const outside = all.filter((f) => !closure.has(f));
  console.log(`\n# shared-tree files OUTSIDE the closure: ${outside.length}`);
  for (const f of outside) console.log(f);

  if (process.argv.includes("--why")) {
    console.log("\n# importers");
    for (const f of sorted) {
      console.log(`${f}\n  <- ${[...closure.get(f)!].sort().join("\n  <- ")}`);
    }
  }
}

main();
