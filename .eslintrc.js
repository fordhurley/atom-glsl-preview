module.exports = {
  env: {
    node: true,
    browser: true,
  },
  extends: "airbnb",
  rules: {
    "quotes": ["error", "double"],
    "no-plusplus": ["error", {"allowForLoopAfterthoughts": true}],
  },
};
