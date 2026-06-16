import globals from "globals";

export default [
  {
    files: ["assets/js/**/*.js", "services/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        // WebExtension API — present in Firefox extension pages but not in globals.browser
        browser: "readonly",
      },
    },
    rules: {
      "eqeqeq": ["error", "always", { "null": "ignore" }],
      "no-console": "off",
      "no-undef": "error",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrors: "none" }],
      "no-var": "error",
      "prefer-const": "error",
    },
  },
];
