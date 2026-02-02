/**
 * 自定义 Changelog 生成器
 * 支持表情符号、PR 链接、作者信息
 */

const { getInfo, getInfoFromPullRequest } = require("@changesets/get-github-info")

/**
 * 根据变更描述的前缀返回对应的表情符号
 */
function getEmoji(summary) {
  const lowerSummary = summary.toLowerCase().trim()

  const emojiMap = [
    { patterns: [/^feat[:\s]/i, /^feature[:\s]/i], emoji: "✨" },
    { patterns: [/^fix[:\s]/i, /^bugfix[:\s]/i], emoji: "🐞" },
    { patterns: [/^docs?[:\s]/i], emoji: "📃" },
    { patterns: [/^chore[:\s]/i], emoji: "🛠" },
    { patterns: [/^refactor[:\s]/i], emoji: "♻️" },
    { patterns: [/^perf[:\s]/i, /^performance[:\s]/i], emoji: "⚡" },
    { patterns: [/^style[:\s]/i], emoji: "💄" },
    { patterns: [/^test[:\s]/i], emoji: "✅" },
    { patterns: [/^build[:\s]/i], emoji: "📦" },
    { patterns: [/^ci[:\s]/i], emoji: "🔧" },
    { patterns: [/^breaking[:\s]/i, /^BREAKING[:\s]/], emoji: "💥" },
  ]

  for (const { patterns, emoji } of emojiMap) {
    if (patterns.some((pattern) => pattern.test(lowerSummary))) {
      return emoji
    }
  }

  return "📝" // 默认表情
}

/**
 * 移除前缀（如 "feat: xxx" -> "xxx"）
 */
function removePrefix(summary) {
  return summary
    .replace(
      /^(feat|feature|fix|bugfix|docs?|chore|refactor|perf|performance|style|test|build|ci|breaking)[:\s]+/i,
      ""
    )
    .trim()
}

/**
 * 获取单个变更的发布行
 */
async function getReleaseLine(changeset, type, options) {
  if (!options || !options.repo) {
    throw new Error(
      "请在 changelog 配置中提供 repo 参数，例如:\n" +
        '"changelog": ["./.changeset/changelog-config.cjs", { "repo": "org/repo" }]'
    )
  }

  // 解析 PR 号和 commit
  let prFromSummary
  let commitFromSummary
  const usersFromSummary = []

  const replacedChangelog = changeset.summary
    .replace(/^\s*(?:pr|pull|pull\s+request):\s*#?(\d+)/im, (_, pr) => {
      const num = Number(pr)
      if (!Number.isNaN(num)) prFromSummary = num
      return ""
    })
    .replace(/^\s*commit:\s*([^\s]+)/im, (_, commit) => {
      commitFromSummary = commit
      return ""
    })
    .replace(/^\s*(?:author|user):\s*@?([^\s]+)/gim, (_, user) => {
      usersFromSummary.push(user)
      return ""
    })
    .trim()

  const [firstLine, ...futureLines] = replacedChangelog.split("\n").map((l) => l.trimEnd())

  // 获取 GitHub 信息
  let links = { commit: null, pull: null, user: null }

  try {
    if (prFromSummary !== undefined) {
      const info = await getInfoFromPullRequest({
        repo: options.repo,
        pull: prFromSummary,
      })
      links = info.links
      if (info.user && !usersFromSummary.includes(info.user)) {
        usersFromSummary.push(info.user)
      }
    } else {
      const commitToFetchFrom = commitFromSummary || changeset.commit
      if (commitToFetchFrom) {
        const info = await getInfo({
          repo: options.repo,
          commit: commitToFetchFrom,
        })
        links = info.links
        if (info.user && !usersFromSummary.includes(info.user)) {
          usersFromSummary.push(info.user)
        }
      }
    }
  } catch (e) {
    // GitHub API 调用失败时静默处理
    console.warn("获取 GitHub 信息失败:", e.message)
  }

  // 获取表情符号
  const emoji = getEmoji(firstLine)

  // 移除前缀（如果有的话）
  const cleanFirstLine = removePrefix(firstLine)

  // 构建输出
  const parts = []

  // 主要内容：表情符号 + 描述
  parts.push(`- ${emoji} ${cleanFirstLine}`)

  // 作者信息
  if (usersFromSummary.length > 0) {
    const users = usersFromSummary.map((u) => `@${u}`).join(", ")
    parts.push(` - Thanks ${users}!`)
  }

  // PR 或 Commit 链接
  if (links.pull) {
    parts.push(` ${links.pull}`)
  } else if (links.commit) {
    parts.push(` ${links.commit}`)
  }

  let returnVal = parts.join("")

  // 添加额外的行（如果有多行描述）
  if (futureLines.length > 0) {
    returnVal += "\n" + futureLines.map((l) => `  ${l}`).join("\n")
  }

  return "\n" + returnVal
}

/**
 * 获取依赖更新的发布行
 */
async function getDependencyReleaseLine(changesets, dependenciesUpdated, options) {
  if (dependenciesUpdated.length === 0) return ""

  const commitLinks = await Promise.all(
    changesets.map(async (cs) => {
      if (cs.commit) {
        try {
          const { links } = await getInfo({
            repo: options.repo,
            commit: cs.commit,
          })
          return links.commit
        } catch (e) {
          return `[\`${cs.commit.slice(0, 7)}\`](https://github.com/${options.repo}/commit/${cs.commit})`
        }
      }
      return null
    })
  )

  const validLinks = commitLinks.filter(Boolean)
  const changesetLink =
    validLinks.length > 0
      ? `- 📦 Updated dependencies [${validLinks.join(", ")}]:`
      : "- 📦 Updated dependencies:"

  const updatedDependenciesList = dependenciesUpdated.map(
    (dependency) => `  - \`${dependency.name}@${dependency.newVersion}\``
  )

  return [changesetLink, ...updatedDependenciesList].join("\n")
}

module.exports = {
  getReleaseLine,
  getDependencyReleaseLine,
}
