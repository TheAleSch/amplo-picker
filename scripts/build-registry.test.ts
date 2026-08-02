import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  assertSafeItemName,
  buildRegistry,
  resolveContained,
  deriveTarget,
  ENGINE_UI_ALLOWLIST,
  stripComments,
  lintEngineFile,
} from "./build-registry";

describe("assertSafeItemName — output containment (Sec-1)", () => {
  it("accepts plain registry item names", () => {
    expect(() => assertSafeItemName("color-picker")).not.toThrow();
    expect(() => assertSafeItemName("fill-picker-radix")).not.toThrow();
  });

  it("rejects path traversal and separators", () => {
    expect(() => assertSafeItemName("../../package")).toThrow();
    expect(() => assertSafeItemName("..")).toThrow();
    expect(() => assertSafeItemName("a/b")).toThrow();
    expect(() => assertSafeItemName("a\\b")).toThrow();
    expect(() => assertSafeItemName("/etc/passwd")).toThrow();
    expect(() => assertSafeItemName("")).toThrow();
  });
});

describe("resolveContained — read containment (Sec-2)", () => {
  let root: string;
  let outside: string;

  beforeAll(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "reg-root-"));
    outside = fs.mkdtempSync(path.join(os.tmpdir(), "reg-outside-"));
    fs.writeFileSync(path.join(root, "inside.txt"), "ok");
    fs.writeFileSync(path.join(outside, "secret.txt"), "leak");
    fs.symlinkSync(
      path.join(outside, "secret.txt"),
      path.join(root, "link-out.txt"),
    );
  });

  afterAll(() => {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  });

  it("resolves a normal in-root file", () => {
    const p = resolveContained(root, "inside.txt");
    expect(fs.readFileSync(p, "utf8")).toBe("ok");
  });

  it("rejects .. traversal", () => {
    expect(() =>
      resolveContained(root, "../" + path.basename(outside) + "/secret.txt"),
    ).toThrow(/escapes/);
  });

  it("rejects symlinks pointing outside the root", () => {
    expect(() => resolveContained(root, "link-out.txt")).toThrow(/escapes/);
  });
});

// T-7 (2026-07-25 adversarial review): the emit path itself — the whole point
// of this script — had no coverage. Only the two containment helpers above
// were tested, so gutting the file-inlining loop, dropping the legacy alias,
// or leaking file `content` into the public catalog index all stayed green.
describe("buildRegistry — emit (T-7)", () => {
  let root: string;
  let outDir: string;

  const manifest = {
    name: "fixture-registry",
    homepage: "https://example.test",
    items: [
      {
        name: "fill-picker",
        type: "registry:ui",
        title: "Fill Picker",
        dependencies: ["culori"],
        registryDependencies: ["color-picker"],
        files: [
          {
            path: "parts/a.tsx",
            type: "registry:ui",
            target: "components/ui/a.tsx",
          },
        ],
      },
      {
        name: "color-picker",
        type: "registry:ui",
        files: [
          {
            path: "parts/b.ts",
            type: "registry:lib",
            target: "lib/b.ts",
          },
        ],
      },
    ],
  };

  const A_SOURCE = 'export const A = "α — unicode + \\"quotes\\"";\n';
  const B_SOURCE = "export const B = 2;\n";

  beforeAll(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "reg-build-"));
    outDir = path.join(root, "public", "r");
    fs.mkdirSync(path.join(root, "parts"), { recursive: true });
    fs.writeFileSync(path.join(root, "parts", "a.tsx"), A_SOURCE);
    fs.writeFileSync(path.join(root, "parts", "b.ts"), B_SOURCE);
    fs.writeFileSync(
      path.join(root, "registry.json"),
      JSON.stringify(manifest, null, 2),
    );
    buildRegistry({
      root,
      manifest: path.join(root, "registry.json"),
      outDir,
      quiet: true,
    });
  });

  afterAll(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  const read = (name: string) =>
    JSON.parse(fs.readFileSync(path.join(outDir, name), "utf8"));

  it("inlines each referenced file's content byte-for-byte", () => {
    const bundle = read("fill-picker.json");
    expect(bundle.files).toHaveLength(1);
    expect(bundle.files[0].content).toBe(A_SOURCE);
    expect(bundle.files[0].path).toBe("parts/a.tsx");
    expect(bundle.files[0].target).toBe("components/ui/a.tsx");
    expect(read("color-picker.json").files[0].content).toBe(B_SOURCE);
  });

  it("propagates dependencies and registryDependencies verbatim", () => {
    const bundle = read("fill-picker.json");
    expect(bundle.dependencies).toEqual(["culori"]);
    expect(bundle.registryDependencies).toEqual(["color-picker"]);
  });

  it("defaults missing dependency arrays to empty rather than undefined", () => {
    const bundle = read("color-picker.json");
    expect(bundle.dependencies).toEqual([]);
    expect(bundle.registryDependencies).toEqual([]);
  });

  it("writes the legacy fill-picker-base alias with identical content", () => {
    expect(fs.existsSync(path.join(outDir, "fill-picker-base.json"))).toBe(true);
    expect(read("fill-picker-base.json")).toEqual(read("fill-picker.json"));
  });

  it("keeps file content OUT of the public catalog index", () => {
    const catalog = read("registry.json");
    expect(catalog.items).toHaveLength(2);
    for (const item of catalog.items) {
      for (const file of item.files) {
        expect(file).not.toHaveProperty("content");
        // `target` is optional and JSON.stringify drops it when undefined —
        // the invariant is that nothing beyond this metadata trio appears.
        for (const key of Object.keys(file)) {
          expect(["path", "target", "type"]).toContain(key);
        }
      }
    }
    // The catalog must not carry the source anywhere, under any key.
    expect(JSON.stringify(catalog)).not.toContain("unicode");
  });

  it("carries catalog-level metadata through", () => {
    const catalog = read("registry.json");
    expect(catalog.name).toBe("fixture-registry");
    expect(catalog.homepage).toBe("https://example.test");
    expect(catalog.$schema).toBe("https://ui.shadcn.com/schema/registry.json");
  });

  it("throws rather than emitting empty content when a file is missing", () => {
    const bad = fs.mkdtempSync(path.join(os.tmpdir(), "reg-bad-"));
    fs.writeFileSync(
      path.join(bad, "registry.json"),
      JSON.stringify({
        name: "bad",
        items: [
          {
            name: "ghost",
            type: "registry:ui",
            files: [{ path: "does/not/exist.ts", type: "registry:ui" }],
          },
        ],
      }),
    );
    expect(() =>
      buildRegistry({
        root: bad,
        manifest: path.join(bad, "registry.json"),
        outDir: path.join(bad, "out"),
        quiet: true,
      }),
    ).toThrow();
    fs.rmSync(bad, { recursive: true, force: true });
  });

  it("rejects a manifest item name that would escape the output dir", () => {
    const bad = fs.mkdtempSync(path.join(os.tmpdir(), "reg-bad-name-"));
    fs.writeFileSync(
      path.join(bad, "registry.json"),
      JSON.stringify({
        name: "bad",
        items: [{ name: "../pwned", type: "registry:ui", files: [] }],
      }),
    );
    expect(() =>
      buildRegistry({
        root: bad,
        manifest: path.join(bad, "registry.json"),
        outDir: path.join(bad, "out"),
        quiet: true,
      }),
    ).toThrow(/safe filename/);
    fs.rmSync(bad, { recursive: true, force: true });
  });
});

// D4: once source trees move to registry/new-york/ui/<dir>/..., manifest
// entries no longer need an explicit `target` — it's mechanically derivable
// from the path. `deriveTarget` is the pure mapping; the emit sites (bundle
// + catalog) fall back to it via `f.target ?? deriveTarget(f.path)`.
describe("deriveTarget — ui-tree path derivation (D4)", () => {
  it("derives @ui/<dir>/<rest> from registry/new-york/ui/<dir>/<rest>", () => {
    expect(deriveTarget("registry/new-york/ui/button/button.tsx")).toBe(
      "@ui/button/button.tsx",
    );
    expect(
      deriveTarget("registry/new-york/ui/color-picker/parts/root.tsx"),
    ).toBe("@ui/color-picker/parts/root.tsx");
  });

  // The alias-NAME form is load-bearing: the CLI resolves `@<alias>/<rest>`
  // against components.json (shadcn >= 4.7.0) but treats `@/…` as a literal
  // relative path, installing to `<cwd>/src/@/components/ui/…`.
  it("never emits the unresolvable @/-prefixed form", () => {
    expect(deriveTarget("registry/new-york/ui/button/button.tsx")).not.toMatch(
      /^@\//,
    );
  });

  it("throws for paths outside the ui tree", () => {
    expect(() =>
      deriveTarget("registry/new-york/color-picker/parts/root.tsx"),
    ).toThrow(/ui tree/);
    expect(() => deriveTarget("src/components/ui/button.tsx")).toThrow();
  });
});

describe("buildRegistry — derived target emission (D4)", () => {
  let root: string;
  let outDir: string;

  const manifest = {
    name: "fixture-registry",
    items: [
      {
        name: "button",
        type: "registry:ui",
        files: [
          {
            path: "registry/new-york/ui/button/button.tsx",
            type: "registry:ui",
            // no `target` — must be derived from `path`.
          },
        ],
      },
    ],
  };

  beforeAll(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "reg-derive-"));
    outDir = path.join(root, "public", "r");
    fs.mkdirSync(path.join(root, "registry", "new-york", "ui", "button"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(root, "registry", "new-york", "ui", "button", "button.tsx"),
      "export const Button = () => null;\n",
    );
    fs.writeFileSync(
      path.join(root, "registry.json"),
      JSON.stringify(manifest, null, 2),
    );
    buildRegistry({
      root,
      manifest: path.join(root, "registry.json"),
      outDir,
      quiet: true,
    });
  });

  afterAll(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  const read = (name: string) =>
    JSON.parse(fs.readFileSync(path.join(outDir, name), "utf8"));

  it("derives the target in the per-item bundle when none is given", () => {
    const bundle = read("button.json");
    expect(bundle.files[0].target).toBe("@ui/button/button.tsx");
  });

  it("derives the target in the public catalog index when none is given", () => {
    const catalog = read("registry.json");
    expect(catalog.items[0].files[0].target).toBe("@ui/button/button.tsx");
  });
});

// F3: `*-engine` items are meant to be dialect-agnostic — they may only
// reference the small set of UI primitives that are stable across shadcn
// dialects (Radix vs Base UI). A stray import of, say, `@/components/ui/
// tooltip` from an engine file would silently couple the engine to one
// dialect's tooltip API. Catch it at build time instead of at a consumer's
// `tsc`.
describe("lintEngineFile / stripComments — engine dialect-agnosticism lint (F3)", () => {
  it("strips // and block comments without touching code", () => {
    expect(stripComments("const x = 1; // trailing comment\n")).toBe(
      "const x = 1; \n",
    );
    expect(stripComments("/* block */ const y = 2;")).toBe(" const y = 2;");
    expect(stripComments('const url = "https://example.com";')).toBe(
      'const url = "https://example.com";',
    );
  });

  it("flags an import outside the allowlist", () => {
    const errs = lintEngineFile(
      "x-engine",
      "parts/root.tsx",
      'import { Tooltip } from "@/components/ui/tooltip";\n',
    );
    expect(errs).toHaveLength(1);
    expect(errs[0]).toContain("x-engine");
    expect(errs[0]).toContain("parts/root.tsx");
    expect(errs[0]).toContain("tooltip");
  });

  it("passes when the same text only appears inside a comment", () => {
    const errs = lintEngineFile(
      "x-engine",
      "parts/root.tsx",
      '/* see @/components/ui/tooltip for context */\nexport const x = 1;\n',
    );
    expect(errs).toEqual([]);
  });

  it("passes for allowlisted imports (button)", () => {
    const errs = lintEngineFile(
      "x-engine",
      "parts/root.tsx",
      'import { Button } from "@/components/ui/button";\n',
    );
    expect(errs).toEqual([]);
  });

  it("allowlist is exactly button, toggle, input", () => {
    expect(ENGINE_UI_ALLOWLIST).toEqual(["button", "toggle", "input"]);
  });
});

describe("buildRegistry — engine lint enforcement (F3)", () => {
  let root: string;

  const writeFixture = (fileContent: string) => {
    const r = fs.mkdtempSync(path.join(os.tmpdir(), "reg-engine-"));
    fs.mkdirSync(path.join(r, "parts"), { recursive: true });
    fs.writeFileSync(path.join(r, "parts", "root.tsx"), fileContent);
    fs.writeFileSync(
      path.join(r, "registry.json"),
      JSON.stringify({
        name: "fixture-registry",
        items: [
          {
            name: "x-engine",
            type: "registry:lib",
            files: [
              {
                path: "parts/root.tsx",
                type: "registry:lib",
                target: "parts/root.tsx",
              },
            ],
          },
        ],
      }),
    );
    return r;
  };

  afterAll(() => {
    if (root) fs.rmSync(root, { recursive: true, force: true });
  });

  it("throws, naming the offending file, when an engine item imports a non-allowlisted ui component", () => {
    root = writeFixture(
      'import { Tooltip } from "@/components/ui/tooltip";\nexport const x = 1;\n',
    );
    expect(() =>
      buildRegistry({
        root,
        manifest: path.join(root, "registry.json"),
        outDir: path.join(root, "public", "r"),
        quiet: true,
      }),
    ).toThrow(/parts\/root\.tsx/);
  });

  it("passes when the mention is inside a comment", () => {
    root = writeFixture(
      '/* import { Tooltip } from "@/components/ui/tooltip"; */\nexport const x = 1;\n',
    );
    expect(() =>
      buildRegistry({
        root,
        manifest: path.join(root, "registry.json"),
        outDir: path.join(root, "public", "r"),
        quiet: true,
      }),
    ).not.toThrow();
  });

  it("passes for an allowlisted import (button)", () => {
    root = writeFixture(
      'import { Button } from "@/components/ui/button";\nexport const x = 1;\n',
    );
    expect(() =>
      buildRegistry({
        root,
        manifest: path.join(root, "registry.json"),
        outDir: path.join(root, "public", "r"),
        quiet: true,
      }),
    ).not.toThrow();
  });
});

// F4: the e2e CLI-install harness (Task 1) sets REGISTRY_BASE_URL to a local
// static server before running the build, so registryDependencies pointing
// at the production host resolve hermetically instead of hitting the real
// deployed site.
describe("buildRegistry — hermetic base-URL override (F4)", () => {
  let root: string;
  let outDir: string;

  const manifest = {
    name: "fixture-registry",
    items: [
      {
        name: "x",
        type: "registry:ui",
        registryDependencies: [
          "utils",
          "https://amplo.ale.design/r/color-picker-radix.json",
        ],
        files: [
          {
            path: "parts/a.ts",
            type: "registry:lib",
            target: "parts/a.ts",
          },
        ],
      },
    ],
  };

  beforeAll(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "reg-baseurl-"));
    outDir = path.join(root, "public", "r");
    fs.mkdirSync(path.join(root, "parts"), { recursive: true });
    fs.writeFileSync(path.join(root, "parts", "a.ts"), "export const a = 1;\n");
    fs.writeFileSync(
      path.join(root, "registry.json"),
      JSON.stringify(manifest, null, 2),
    );
  });

  afterAll(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  const read = (name: string) =>
    JSON.parse(fs.readFileSync(path.join(outDir, name), "utf8"));

  it("rewrites the production host to the override in the bundle", () => {
    buildRegistry({
      root,
      manifest: path.join(root, "registry.json"),
      outDir,
      quiet: true,
      baseUrl: "http://localhost:8998",
    });
    const bundle = read("x.json");
    expect(bundle.registryDependencies).toEqual([
      "utils",
      "http://localhost:8998/r/color-picker-radix.json",
    ]);
  });

  it("rewrites the production host to the override in the catalog", () => {
    buildRegistry({
      root,
      manifest: path.join(root, "registry.json"),
      outDir,
      quiet: true,
      baseUrl: "http://localhost:8998",
    });
    const catalog = read("registry.json");
    expect(catalog.items[0].registryDependencies).toEqual([
      "utils",
      "http://localhost:8998/r/color-picker-radix.json",
    ]);
  });

  it("leaves registryDependencies unchanged with no override", () => {
    buildRegistry({
      root,
      manifest: path.join(root, "registry.json"),
      outDir,
      quiet: true,
      baseUrl: undefined,
    });
    const bundle = read("x.json");
    expect(bundle.registryDependencies).toEqual([
      "utils",
      "https://amplo.ale.design/r/color-picker-radix.json",
    ]);
  });
});
