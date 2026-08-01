#!/usr/bin/env tsx
/**
 * Generates a throwaway "consumer" project that the shadcn CLI can install into.
 *
 * Usage: pnpm tsx scripts/e2e/consumer-fixtures.ts <dir> <standard|renderer> <radix|base>
 *
 * The two layouts differ only in where the `@/*` alias points:
 *   standard → ./src/*            (the vanilla create-next-app shape)
 *   renderer → ./src/renderer/*   (the Electron-style shape that exposes the
 *                                  alias-blind `target` bug in the registry)
 *
 * The two styles pick which components.json `style` is declared, and which
 * smoke page is written (base imports the Base UI barrel, radix the classic
 * ColorPicker/GradientPicker barrels).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

type Layout = "standard" | "renderer";
type Style = "radix" | "base";

const [dirArg, layoutArg, styleArg] = process.argv.slice(2);

if (!dirArg || !layoutArg || !styleArg) {
  console.error(
    "usage: consumer-fixtures.ts <dir> <standard|renderer> <radix|base>",
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
    name: `amplo-e2e-${layout}-${style}`,
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
      ui: "@/components/ui",
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
    ? `import { FillPicker } from "@/components/ui/fill-picker-base/fill";\nexport default function Page() { return <div>{typeof FillPicker}</div>; }\n`
    : `import { ColorPicker } from "@/components/ui/fill-picker/color-picker";\nimport { GradientPicker } from "@/components/ui/fill-picker/gradient-picker";\nexport default function Page() { return <div>{typeof ColorPicker}{typeof GradientPicker}</div>; }\n`,
);

console.log(`fixture: ${dir} (layout=${layout} style=${style} alias=@/* -> ./${srcRoot}/*)`);
