import { defineConfig, globalIgnores } from "eslint/config";
import nextPlugin from "@next/eslint-plugin-next";

const eslintConfig = defineConfig([
  nextPlugin.configs["core-web-vitals"],
  globalIgnores([
    "node_modules/**",
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "tests/**",
    "collector-node/**",
    "scripts/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
