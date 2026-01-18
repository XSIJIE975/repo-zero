module.exports = {
  "*.{js,jsx,ts,tsx,cjs,mjs,json,jsonc}": [
    "biome check --write --no-errors-on-unmatched",
    "biome format --write --no-errors-on-unmatched",
  ],
}
