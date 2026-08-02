#!/usr/bin/env tsx
/**
 * Generates a throwaway "consumer" project that the shadcn CLI can install into.
 *
 * Usage: pnpm tsx scripts/e2e/consumer-fixtures.ts <dir> <standard|renderer> <radix|base> [uiAlias]
 *
 * The two layouts differ only in where the `@/*` alias points:
 *   standard → ./src/*            (the vanilla create-next-app shape)
 *   renderer → ./src/renderer/*   (the Electron-style shape that exposes the
 *                                  alias-blind `target` bug in the registry)
 *
 * The two styles pick which components.json `style` is declared, and which
 * smoke page is written (base imports the Base UI barrel, radix the classic
 * ColorPicker/GradientPicker barrels).
 *
 * `uiAlias` (default `@/components/ui`) is the components.json `aliases.ui`.
 * Passing a nonstandard value such as `@/ui` proves the derived `@ui/…`
 * targets follow the consumer's alias rather than a hardcoded
 * `components/ui` guess.
 *
 * Base fixtures also get a `smoke.tsx` that the harness EXECUTES (tsx):
 * `tsc` alone only checks types, so it cannot catch a module-eval failure in
 * the barrel↔parts cycle the CLI's import redirect creates. The smoke script
 * imports the base fill barrel and server-renders a small tree through it.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

type Layout = "standard" | "renderer";
type Style = "radix" | "base";

const [dirArg, layoutArg, styleArg, uiAliasArg] = process.argv.slice(2);

if (!dirArg || !layoutArg || !styleArg) {
  console.error(
    "usage: consumer-fixtures.ts <dir> <standard|renderer> <radix|base> [uiAlias]",
  );
  process.exit(2);
}
if (layoutArg !== "standard" && layoutArg !== "renderer") {
  console.error(`unknown layout: ${layoutArg} (expected standard|renderer)`);
  process.exit(2);
}
if (styleArg !== "radix" && styleArg !== "base") {
  console.error(`unknown style: ${styleArg} (expected radix|base)`);
  process.exit(2);
}

const dir = resolve(dirArg);
const layout: Layout = layoutArg;
const style: Style = styleArg;
/** components.json `aliases.ui` — where installed ui files are expected. */
const uiAlias = uiAliasArg || "@/components/ui";

if (!uiAlias.startsWith("@/")) {
  console.error(`uiAlias must start with "@/": ${uiAlias}`);
  process.exit(2);
}

/** Alias root: everything `@/*` resolves to, relative to the consumer root. */
const srcRoot = layout === "renderer" ? "src/renderer" : "src";

/** Write `content` to `<dir>/<rel>`, creating parent directories. */
const w = (rel: string, content: string) => {
  const file = join(dir, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content, "utf8");
};

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

w(
  "package.json",
  json({
    name: `amplo-e2e-${layout}-${style}${uiAlias === "@/components/ui" ? "" : "-uialias"}`,
    version: "0.0.0",
    private: true,
    dependencies: {
      next: "^15.5.4",
      react: "^19.1.0",
      "react-dom": "^19.1.0",
    },
    devDependencies: {
      "@types/node": "^22.15.0",
      "@types/react": "^19.1.0",
      "@types/react-dom": "^19.1.0",
      // Runs smoke.tsx (base fixtures) with the consumer's own tsconfig paths.
      tsx: "^4.20.0",
      typescript: "^5.9.2",
    },
  }),
);

w(
  "tsconfig.json",
  json({
    compilerOptions: {
      target: "ES2022",
      lib: ["dom", "dom.iterable", "esnext"],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: "esnext",
      moduleResolution: "bundler",
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: "preserve",
      incremental: true,
      baseUrl: ".",
      paths: { "@/*": [`./${srcRoot}/*`] },
    },
    include: ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
    exclude: ["node_modules"],
  }),
);

w(
  "components.json",
  json({
    $schema: "https://ui.shadcn.com/schema.json",
    style: style === "base" ? "base-mira" : "new-york-v4",
    rsc: false,
    tsx: true,
    tailwind: {
      config: "",
      css: `${srcRoot}/globals.css`,
      baseColor: "zinc",
      cssVariables: true,
      prefix: "",
    },
    aliases: {
      components: "@/components",
      ui: uiAlias,
      hooks: "@/hooks",
      lib: "@/lib",
      utils: "@/lib/utils",
    },
    iconLibrary: "lucide",
  }),
);

// pnpm >= 10 aborts the install with ERR_PNPM_IGNORED_BUILDS when a transitive
// dependency (next -> sharp) ships a build script the user has not approved.
// The fixture never runs the app, so downgrade that to a warning instead of
// approving builds interactively (which the harness cannot do). The setting has
// to live in pnpm-workspace.yaml — the .npmrc / package.json#pnpm equivalents
// are ignored by pnpm 11.
w("pnpm-workspace.yaml", "strictDepBuilds: false\n");

w(`${srcRoot}/globals.css`, `@import "tailwindcss";\n`);

w(
  `${srcRoot}/lib/utils.ts`,
  `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`,
);

w(
  `${srcRoot}/app/page.tsx`,
  style === "base"
    ? `import { FillPicker } from "${uiAlias}/fill-picker-base/fill";\nexport default function Page() { return <div>{typeof FillPicker}</div>; }\n`
    : `import { ColorPicker } from "${uiAlias}/fill-picker/color-picker";\nimport { GradientPicker } from "${uiAlias}/fill-picker/gradient-picker";\nexport default function Page() { return <div>{typeof ColorPicker}{typeof GradientPicker}</div>; }\n`,
);

// Runtime smoke (base only): evaluating the barrel is what exercises the
// barrel↔parts module cycle the CLI's aliased-import redirect introduces in
// installed projects, and rendering through it proves the cycle resolves in
// dependency order rather than handing a part an undefined re-export.
if (style === "base") {
  w(
    "smoke.tsx",
    `// The consumer tsconfig declares jsx: "preserve" (Next compiles it), so the
// standalone runner falls back to the classic transform — React must be in scope.
import * as React from "react";
import { renderToString } from "react-dom/server";
import { FillPicker, type Fill } from "${uiAlias}/fill-picker-base/fill";

const value: Fill = { kind: "color", color: { l: 0.7, c: 0.15, h: 250, alpha: 1 } };

const html = renderToString(
  <FillPicker.Root value={value}>
    <FillPicker.Tabs>
      <FillPicker.Tab mode="color">Solid</FillPicker.Tab>
      <FillPicker.Tab mode="gradient">Gradient</FillPicker.Tab>
    </FillPicker.Tabs>
  </FillPicker.Root>,
);

if (!html.includes('role="tablist"') || !html.includes('role="tab"')) {
  console.error("smoke: unexpected markup\\n" + html);
  process.exit(1);
}
console.log("smoke: rendered " + html.length + " chars through the base barrel");
`,
  );
}

console.log(
  `fixture: ${dir} (layout=${layout} style=${style} alias=@/* -> ./${srcRoot}/* ui=${uiAlias})`,
);
