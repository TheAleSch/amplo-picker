#!/usr/bin/env tsx
/**
 * Reads registry.json (the source manifest), bundles the contents of each
 * referenced file, and emits a per-component JSON file under public/r/.
 * Those URLs are what the shadcn CLI consumes:
 *   npx shadcn@latest add https://<host>/r/color-picker.json
 */

import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(process.cwd());
const MANIFEST = path.join(ROOT, "registry.json");
const OUT_DIR = path.join(ROOT, "public", "r");

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

function main() {
  const manifest: Manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const item of manifest.items) {
    const out = {
      $schema: "https://ui.shadcn.com/schema/registry-item.json",
      name: item.name,
      type: item.type,
      title: item.title,
      description: item.description,
      dependencies: item.dependencies ?? [],
      registryDependencies: item.registryDependencies ?? [],
      files: item.files.map((f) => {
        const content = fs.readFileSync(path.join(ROOT, f.path), "utf8");
        return {
          path: f.path,
          type: f.type,
          target: f.target,
          content,
        };
      }),
    };
    const outPath = path.join(OUT_DIR, `${item.name}.json`);
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
    console.log(`✓ wrote ${path.relative(ROOT, outPath)} (${out.files.length} files)`);
  }

  const indexPath = path.join(OUT_DIR, "index.json");
  fs.writeFileSync(
    indexPath,
    JSON.stringify(
      {
        name: manifest.name,
        homepage: manifest.homepage,
        items: manifest.items.map((i) => ({
          name: i.name,
          type: i.type,
          title: i.title,
          description: i.description,
        })),
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`✓ wrote ${path.relative(ROOT, indexPath)}`);
}

main();
