import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // These modules intentionally export both a component and its public
  // helper/variant. Fast Refresh supports the component exports; splitting
  // every helper into a new file would make the shared UI API less usable.
  {
    files: [
      "src/components/ui/**/*.tsx",
      "src/components/FeedbackWidget.tsx",
      "src/components/WelcomeFeedbackDialog.tsx",
      "src/lib/locale.tsx",
    ],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
);
