import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
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
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // Keep render paths compatible with React's ref and effect semantics.
      // These are errors now that the pre-v7 patterns have been removed.
      "react-hooks/refs": "error",
      "react-hooks/set-state-in-effect": "error",
      "react-hooks/exhaustive-deps": "error",

      // Use typographic punctuation in visible JSX copy.
      "react/no-unescaped-entities": "error",

      // Keep registry boundaries explicitly typed.
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
];

export default eslintConfig;
