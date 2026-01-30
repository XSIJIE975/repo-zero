# RepoZero

[English](#english) | [中文](#中文)

---

<a name="english"></a>

## English

### The Nuclear Option for Bloated Git Repositories

**RepoZero** is a desktop application that helps you completely reset a Git repository's history. When your repo has grown too large with years of accumulated commits, branches, and tags, RepoZero provides a clean slate with a beautiful GUI.

### Features

- **Complete History Reset** - Removes all commits, branches, and tags from remote
- **Smart Default Branch Detection** - Automatically detects `main` or `master` as the default branch
- **Safe Execution** - Requires explicit confirmation before any destructive operation
- **Real-time Progress Logging** - Watch the cleanup process in a terminal-like panel
- **Cross-Platform** - Works on Windows, macOS (Apple Silicon), and Linux
- **Multi-language Support** - English and Chinese UI
- **Auto-Update** - Built-in updater keeps you on the latest version

### Screenshots

<!-- Add screenshots here -->

### Installation

Download the latest release for your platform from the [Releases](https://github.com/XSIJIE975/repo-zero/releases) page:

| Platform | Download |
|----------|----------|
| Windows (x64) | `.msi` or `.exe` |
| Windows (x86) | `.msi` or `.exe` |
| macOS (Apple Silicon) | `.dmg` |
| Linux | `.deb`, `.rpm`, or `.AppImage` |

### Requirements

- **Git** >= 2.28 (required)
- Credential helper configured for remote authentication

### Usage

1. **Launch RepoZero**
2. **Select a Git repository folder**
3. **Review the repository analysis** - See branch count, tag count, and repository size
4. **Choose the target branch** - The branch that will remain after reset
5. **Type confirmation text** - Safety measure to prevent accidental execution
6. **Execute** - Watch the progress in real-time

### How It Works

RepoZero performs the following operations:

1. Creates a temporary clean repository
2. Makes an empty root commit
3. Force pushes to your selected default branch
4. Deletes all other branches and tags from the remote

**Warning**: This operation is **irreversible**. All commit history, branches, and tags will be permanently deleted from the remote repository.

### Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm tauri:dev

# Build for production
pnpm tauri:build
```

### Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Rust + Tauri v2
- **UI Components**: Radix UI + shadcn/ui

### License

[MIT License](LICENSE) - Copyright (c) 2026 XSIJIE975

---

<a name="中文"></a>

## 中文

### Git 仓库的核弹级清理工具

**RepoZero** 是一款桌面应用程序，帮助你彻底重置 Git 仓库的历史记录。当你的仓库因多年积累的提交、分支和标签而变得臃肿时，RepoZero 通过精美的图形界面为你提供一个全新的开始。

### 功能特性

- **完全历史重置** - 从远程仓库删除所有提交、分支和标签
- **智能默认分支检测** - 自动检测 `main` 或 `master` 作为默认分支
- **安全执行** - 在执行任何破坏性操作前需要明确确认
- **实时进度日志** - 在终端面板中实时观察清理过程
- **跨平台支持** - 支持 Windows、macOS (Apple Silicon) 和 Linux
- **多语言支持** - 中英文界面
- **自动更新** - 内置更新器保持最新版本

### 截图

<!-- 在这里添加截图 -->

### 安装

从 [Releases](https://github.com/XSIJIE975/repo-zero/releases) 页面下载适合你平台的最新版本：

| 平台 | 下载格式 |
|------|----------|
| Windows (x64) | `.msi` 或 `.exe` |
| Windows (x86) | `.msi` 或 `.exe` |
| macOS (Apple Silicon) | `.dmg` |
| Linux | `.deb`、`.rpm` 或 `.AppImage` |

### 系统要求

- **Git** >= 2.28（必需）
- 已配置远程认证的凭据助手

### 使用方法

1. **启动 RepoZero**
2. **选择 Git 仓库文件夹**
3. **查看仓库分析** - 查看分支数量、标签数量和仓库大小
4. **选择目标分支** - 重置后保留的分支
5. **输入确认文本** - 防止误操作的安全措施
6. **执行** - 实时观察进度

### 工作原理

RepoZero 执行以下操作：

1. 创建临时的干净仓库
2. 创建空的根提交
3. 强制推送到你选择的默认分支
4. 从远程删除所有其他分支和标签

**警告**：此操作**不可逆**。所有提交历史、分支和标签将从远程仓库永久删除。

### 开发

```bash
# 安装依赖
pnpm install

# 开发模式运行
pnpm tauri:dev

# 生产构建
pnpm tauri:build
```

### 技术栈

- **前端**: React + TypeScript + Vite + Tailwind CSS
- **后端**: Rust + Tauri v2
- **UI 组件**: Radix UI + shadcn/ui

### 许可证

[MIT 许可证](LICENSE) - 版权所有 (c) 2026 XSIJIE975
