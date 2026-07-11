import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Data-fetch/init-on-mount effects are intentional here (React supports the
      // pattern); keep visibility as a warning rather than a hard error.
      "react-hooks/set-state-in-effect": "warn",
      // Reading the current time in a per-request dynamic Server Component is valid;
      // the react-compiler "impure during render" check is a false positive there.
      "react-hooks/purity": "warn",
    },
  },
]);

export default eslintConfig;
