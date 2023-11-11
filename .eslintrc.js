module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    sourceType: "module",
    projects: ["./tsconfig.json", "./tsconfig.test.json"],
  },
  extends: ["plugin:@typescript-eslint/recommended"],
  plugins: ["@typescript-eslint"],
  settings: {},
  env: {
    node: true,
  },
  ignorePatterns: [".eslintrc.js"],
  rules: {
    "no-unneeded-ternary": ["error", { defaultAssignment: false }],
    "@typescript-eslint/no-non-null-assertion": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "init-declarations": ["error", "always"],
    "no-lonely-if": "error",
    "object-shorthand": ["error", "always"],
    "@typescript-eslint/consistent-type-assertions": [
      "error",
      {
        assertionStyle: "never",
      },
    ],
    eqeqeq: ["error", "smart"],
  },
}
