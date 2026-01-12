module.exports = {
  root: true,
  extends: ['@ys/eslint-config'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
};
