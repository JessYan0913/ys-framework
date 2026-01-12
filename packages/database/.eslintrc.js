/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ['@ys/eslint-config/index.js'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: true,
  },
};
