import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/r/**",
      "next-env.d.ts",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // shadcn-style components routinely declare `interface FooProps
      // extends React.HTMLAttributes<...> {}` purely for re-export
      // convenience. Allow exactly that pattern; flag truly empty {}.
      "@typescript-eslint/no-empty-object-type": [
        "error",
        { allowInterfaces: "with-single-extends" },
      ],

      // Registry parts use `_`-prefixed args/vars by convention to mark
      // intentionally-unused params (e.g. destructure-and-spread).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // react-hooks v7 added two strict new rules that this codebase
      // pre-dates. The findings are real but require codebase-wide
      // refactors that are out of scope here; surface as warnings so
      // CI doesn't block but the issues stay visible.
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/exhaustive-deps": "warn",

      // Apostrophes and quotes in JSX copy are intentional in the docs
      // and hero strings — escaping them hurts readability with no
      // functional gain. Surface as warning.
      "react/no-unescaped-entities": "warn",

      // Allow `any` in the registry where conversions cross typed
      // boundaries (culori interop, etc.). Warn rather than error.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];
