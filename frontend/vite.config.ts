import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, lazyPlugins } from "vite-plus";

// Layer rules (spec: Architecture). Import direction is app → features → shared.
const noDeepFeatureImports = {
  group: ["@/features/*/**"],
  message: "Import a feature through its index: @/features/<name>.",
};
const noClimbingOut = {
  group: ["../../**"],
  message: "Use the @/ alias instead of climbing out of a folder.",
};

export default defineConfig({
  plugins: lazyPlugins(() => [react({ compiler: true }), tailwindcss()]),
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
  fmt: {
    ignorePatterns: ["legacy/**", "dist/**", "playwright-report/**", "test-results/**"],
  },
  lint: {
    plugins: ["react", "typescript", "oxc", "import", "jsx-a11y"],
    ignorePatterns: ["legacy/**", "dist/**"],
    options: { typeAware: true, typeCheck: true },
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: {
      "react/rules-of-hooks": "error",
      "react/only-export-components": ["warn", { allowConstantExport: true }],
      "vite-plus/prefer-vite-plus-imports": "error",
    },
    overrides: [
      {
        files: ["src/shared/**"],
        rules: {
          "no-restricted-imports": [
            "error",
            {
              patterns: [
                {
                  group: ["@/app", "@/app/**", "@/features", "@/features/**"],
                  message: "shared/ imports only shared/.",
                },
                noClimbingOut,
              ],
            },
          ],
        },
      },
      {
        files: ["src/features/**"],
        rules: {
          "no-restricted-imports": [
            "error",
            {
              patterns: [
                { group: ["@/app", "@/app/**"], message: "features/ must not import app/." },
                noDeepFeatureImports,
                noClimbingOut,
              ],
            },
          ],
        },
      },
      {
        // Deals never knows about filters; the only cross-feature edge is filters → deals.
        files: ["src/features/deals/**"],
        rules: {
          "no-restricted-imports": [
            "error",
            {
              patterns: [
                { group: ["@/app", "@/app/**"], message: "features/ must not import app/." },
                {
                  group: ["@/features/filters", "@/features/filters/**"],
                  message: "deals must not import filters.",
                },
                noDeepFeatureImports,
                noClimbingOut,
              ],
            },
          ],
        },
      },
      {
        files: ["src/app/**"],
        rules: {
          "no-restricted-imports": ["error", { patterns: [noDeepFeatureImports] }],
        },
      },
    ],
  },
});
