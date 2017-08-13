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
  },
};
