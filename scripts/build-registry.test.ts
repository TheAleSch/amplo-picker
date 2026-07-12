import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { assertSafeItemName, resolveContained } from "./build-registry";

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
