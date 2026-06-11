import { defineConfig, globalIgnores } from "eslint/config";
import coreWebVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "android/**",
    "dist/**",
    "public/sw.js",
    "public/workbox-*.js",
    "public/fallback-*.js",
  ]),
  ...coreWebVitals,
  {
    // eslint-plugin-react-hooks v7 ships React-Compiler-strictness rules that
    // flag long-standing patterns in this codebase. Keep them visible as
    // warnings; promote back to errors when the patterns are cleaned up.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/error-boundaries": "warn",
      "react-hooks/globals": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/incompatible-library": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/use-memo": "warn",
      "react-hooks/component-hook-factories": "warn",
      "react-hooks/unsupported-syntax": "warn",
      "react-hooks/config": "warn",
      "react-hooks/gating": "warn",
      "react-hooks/void-use-memo": "warn",
    },
  },
]);
