module.exports = {
  env: {
    node: true,
    browser: true,
  },
  globals: {
    atom: false,
  },
  extends: "airbnb",
  rules: {
    "quotes": ["error", "double"],
    "no-plusplus": ["error", {"allowForLoopAfterthoughts": true}],
    "no-underscore-dangle": ["error", {"allowAfterThis": true}],
    "import/no-unresolved": ["error", {"ignore": ["atom", "electron"] }],
    "import/no-extraneous-dependencies": ["off"],
    "object-curly-spacing": ["error", "never"],
    "no-unused-vars": ["error", {"args": "none"}],
    "comma-dangle": ["error", "only-multiline", {"functions": "never"}],
    "arrow-body-style": ["error", "as-needed", {"requireReturnForObjectLiteral": true}],
  },
};
