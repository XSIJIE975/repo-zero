module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Allow conventional types
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "docs", "style", "refactor", "perf", "test", "chore", "revert"],
    ],

    // Scope is optional but supported (e.g. feat(ui): ...). Allow any scope string.
    "scope-empty": [0],

    // Don't force subject case; different teams prefer different styles.
    "subject-case": [0],
  },
}
