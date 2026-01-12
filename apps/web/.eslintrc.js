/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ['@ys/eslint-config/next.js'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: true,
  },
  ignorePatterns: ['public/pdfjs-dist/**'],
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: ['tsconfig.json'],
      },
    },
  },
};
