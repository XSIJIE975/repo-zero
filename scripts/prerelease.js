#!/usr/bin/env node

/**
 * 预发布版本管理脚本
 * 用法:
 *   node scripts/prerelease.js enter alpha   # 进入 alpha 预发布模式
 *   node scripts/prerelease.js enter beta    # 进入 beta 预发布模式
 *   node scripts/prerelease.js enter rc      # 进入 rc 预发布模式
 *   node scripts/prerelease.js exit          # 退出预发布模式（晋升为正式版）
 */

import { execSync } from "child_process"

const args = process.argv.slice(2)
const command = args[0]
const tag = args[1]

const validTags = ["alpha", "beta", "rc"]

function run(cmd) {
  console.log(`\n$ ${cmd}\n`)
  execSync(cmd, { stdio: "inherit" })
}

function showHelp() {
  console.log(`
预发布版本管理脚本

用法:
  pnpm prerelease enter <tag>   进入预发布模式
  pnpm prerelease exit          退出预发布模式（晋升为正式版）

可用的 tag:
  alpha  - 内部测试版本 (0.1.0-alpha.0)
  beta   - 公开测试版本 (0.1.0-beta.0)
  rc     - 候选发布版本 (0.1.0-rc.0)

示例:
  pnpm prerelease enter beta    # 进入 beta 模式
  pnpm changeset                # 添加变更记录
  pnpm version                  # 生成 0.1.0-beta.0
  pnpm prerelease exit          # 晋升为 0.1.0 正式版
`)
}

if (!command) {
  showHelp()
  process.exit(0)
}

switch (command) {
  case "enter":
    if (!tag || !validTags.includes(tag)) {
      console.error(`❌ 无效的 tag: ${tag}`)
      console.log(`   可用的 tag: ${validTags.join(", ")}`)
      process.exit(1)
    }
    console.log(`🚀 进入 ${tag} 预发布模式...`)
    run(`pnpm changeset pre enter ${tag}`)
    console.log(`\n✅ 已进入 ${tag} 模式`)
    console.log(`   现在运行 'pnpm changeset' 添加变更，然后 'pnpm version' 生成版本`)
    break

  case "exit":
    console.log("🎉 退出预发布模式，晋升为正式版...")
    run("pnpm changeset pre exit")
    console.log("\n✅ 已退出预发布模式")
    console.log("   现在运行 'pnpm version' 生成正式版本")
    break

  default:
    console.error(`❌ 未知命令: ${command}`)
    showHelp()
    process.exit(1)
}
