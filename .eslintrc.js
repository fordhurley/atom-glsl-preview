module.exports = {
  env: {
    node: true,
    browser: true,
    es6: true,
  },
  globals: {
    atom: false,
  },
  parserOptions: {
    ecmaVersion: 6,
  },
  extends: ["eslint:recommended", "google"],
  rules: {
    "quotes": ["error", "double"],
    "require-jsdoc": "off",
    "max-len": ["error", {"code": 100, "ignoreTrailingComments": true}],
    "block-spacing": ["error", "always"],
    "brace-style": ["error", "1tbs", {"allowSingleLine": true}],
  },
};
