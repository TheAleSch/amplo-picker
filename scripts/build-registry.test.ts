import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  assertSafeItemName,
  buildRegistry,
  resolveContained,
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
        files: [{ path: "parts/b.ts", type: "registry:lib" }],
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
