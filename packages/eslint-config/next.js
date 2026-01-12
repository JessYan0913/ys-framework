const { resolve } = require("node:path");

const project = resolve(process.cwd(), "tsconfig.json");

/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [
    "next/core-web-vitals",
    "plugin:tailwindcss/recommended",
    "./index.js",
  ],
  plugins: ["only-warn"],
  globals: {
    React: true,
    JSX: true,
  },
  env: {
    node: true,
    browser: true,
  },
  settings: {
    "import/resolver": {
      typescript: {
        project,
      },
    },
  },
  rules: {
    // tailwind
    "tailwindcss/classnames-order": "off",
    "tailwindcss/no-custom-classname": "off",
    "tailwindcss/no-contradicting-classname": "off",
    "tailwindcss/no-unknown-classes": "off",
    
    // react
    "react/display-name": "error",
    
    // import - disable these for nextjs/react as they can be problematic with components
    // "import/no-default-export": "off",
  },
};
