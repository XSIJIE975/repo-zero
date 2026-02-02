#!/usr/bin/env node

/**
 * 版本同步脚本
 * 将 package.json 的版本号同步到 tauri.conf.json 和 Cargo.toml
 */

import { readFileSync, writeFileSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, "..")

// 读取 package.json 版本号
const packageJsonPath = join(rootDir, "package.json")
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"))
const version = packageJson.version

console.log(`\n📦 Syncing version: ${version}\n`)

let hasChanges = false

// 1. 更新 tauri.conf.json
const tauriConfigPath = join(rootDir, "src-tauri", "tauri.conf.json")
const tauriConfig = JSON.parse(readFileSync(tauriConfigPath, "utf-8"))

if (tauriConfig.version !== version) {
  console.log(`  tauri.conf.json: ${tauriConfig.version} → ${version}`)
  tauriConfig.version = version
  writeFileSync(tauriConfigPath, JSON.stringify(tauriConfig, null, 2) + "\n")
  hasChanges = true
} else {
  console.log(`  tauri.conf.json: ✓ ${version}`)
}

// 2. 更新 Cargo.toml
const cargoTomlPath = join(rootDir, "src-tauri", "Cargo.toml")
let cargoToml = readFileSync(cargoTomlPath, "utf-8")

// 匹配 [package] 下的 version 字段
const versionRegex = /^(version\s*=\s*")([^"]+)(")/m
const match = cargoToml.match(versionRegex)

if (match) {
  const currentVersion = match[2]
  if (currentVersion !== version) {
    console.log(`  Cargo.toml: ${currentVersion} → ${version}`)
    cargoToml = cargoToml.replace(versionRegex, `$1${version}$3`)
    writeFileSync(cargoTomlPath, cargoToml)
    hasChanges = true
  } else {
    console.log(`  Cargo.toml: ✓ ${version}`)
  }
} else {
  console.error("  ❌ Could not find version in Cargo.toml")
  process.exit(1)
}

console.log("")
if (hasChanges) {
  console.log("✅ Version sync completed!\n")
} else {
  console.log("✅ All versions already in sync!\n")
}
