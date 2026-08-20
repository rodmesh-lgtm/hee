import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "generated/**",
    "components/public-business-page.before-*.tsx",
    "next-env.d.ts",
  ]),
  {
    files: [
      "components/public/public-action-dialog.tsx",
      "components/public/public-favorite-button.tsx",
      "components/public/public-smart-action-sheet.tsx",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["app/actions/publication.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["components/public/public-transaction-launcher.tsx"],
    rules: {
      "react-hooks/exhaustive-deps": "off",
    },
  },
  {
    files: [
      "app/dashboard/branding/page.tsx",
      "components/dashboard/offer-designer.tsx",
      "components/public-business-page-v10-light.tsx",
      "components/public/public-contact-team-section.tsx",
      "components/public/public-external-store-section.tsx",
      "components/public/public-portfolio-section.tsx",
      "components/public/public-products-section.tsx",
    ],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
]);

export default eslintConfig;
