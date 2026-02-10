<p align="center">
  <img src="src-tauri/icons/128x128.png" alt="RepoZero logo" width="80" />
</p>

<h1 align="center">RepoZero</h1>

<p align="center">
  Git 仓库的核弹级清理工具<br/>
  通过精美的图形界面重置仓库历史和分支
</p>

<p align="center">
  <a href="https://github.com/XSIJIE975/repo-zero/releases"><img src="https://img.shields.io/github/v/release/XSIJIE975/repo-zero?style=flat-square" alt="最新版本" /></a>
  <a href="https://github.com/XSIJIE975/repo-zero/blob/main/LICENSE"><img src="https://img.shields.io/github/license/XSIJIE975/repo-zero?style=flat-square" alt="MIT 许可证" /></a>
  <a href="https://github.com/XSIJIE975/repo-zero/releases"><img src="https://img.shields.io/github/downloads/XSIJIE975/repo-zero/total?style=flat-square" alt="下载量" /></a>
</p>

<p align="center">
  <a href="README.md">English</a>
</p>

---

## 概述

RepoZero 是一款跨平台桌面应用，用于彻底重置 Git 仓库的历史记录。当你
的仓库经过多年积累了大量提交、分支和标签，而从头开始是最干净的解决方案
时，RepoZero 通过引导式的分步向导帮你完成这一操作。

> **警告：** 此工具执行的操作**不可逆**。所有提交历史、分支和标签将从
> 远程仓库**永久删除**。

## 功能特性

- **完全历史重置** — 从远程仓库删除所有提交、分支和标签
- **智能默认分支检测** — 自动检测远程 HEAD 指向的分支（`main`、
  `master` 或自定义分支）
- **安全优先的工作流** — 在执行任何破坏性操作前需要输入确认文本
- **实时日志面板** — 在可过滤、可调整大小的终端视图中观察清理过程
- **跨平台** — 支持 Windows（x64、x86）、macOS（Apple Silicon）和
  Linux
- **多语言界面** — 支持中文和英文
- **自动更新** — 内置更新器，有新版本时自动通知
- **主题定制** — 亮色/暗色模式，多种强调色可选

## 安装

从 [Releases](https://github.com/XSIJIE975/repo-zero/releases) 页面下载
适合你平台的最新版本。

| 平台                  | 格式                            |
|-----------------------|--------------------------------|
| Windows (x64)        | `.msi` 或 `.exe`               |
| Windows (x86)        | `.msi` 或 `.exe`               |
| macOS (Apple Silicon) | `.dmg`                         |
| Linux                | `.deb`、`.rpm` 或 `.AppImage`   |

### 前置要求

- **Git** >= 2.28，且已添加到系统 `PATH`
- 已配置远程认证的凭据助手（例如 `git credential-manager` 或 SSH 密钥）

## 使用方法

RepoZero 通过五步向导引导你完成操作：

1. **连接** — 选择你想要重置的 Git 仓库所在的本地文件夹。
2. **分析** — 查看仓库元数据：远程 URL、分支数量、标签数量和预估大小。
3. **确认** — 选择目标默认分支，查看即将执行的破坏性操作，输入
   `nuclear reset` 进行确认。
4. **执行** — 重置在后台运行，实时显示进度日志。
5. **完成** — 操作成功。请通知团队成员重新克隆仓库。

## 工作原理

RepoZero 在底层执行以下操作：

1. 创建临时目录并初始化一个干净的 Git 仓库。
2. 从原始仓库配置中复制用户名和邮箱。
3. 创建一个空的根提交
   （`Chore: repository reset and history cleanup`）。
4. 将空提交强制推送到 `origin` 上的目标默认分支。
5. 批量删除所有其他远程分支和标签。
6. 清理临时目录。

如果某些分支或标签删除失败，RepoZero 会报告警告信息，以便你手动处理。

## 开发

### 前置要求

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) >= 10
- [Rust](https://www.rust-lang.org/tools/install)（stable 工具链）
- [Tauri v2](https://v2.tauri.app/start/prerequisites/) 的平台特定依赖

### 快速开始

```bash
# 安装依赖
pnpm install

# 以开发模式启动 Tauri 桌面应用
pnpm tauri:dev

# 或仅启动前端开发服务器（无 Rust 后端）
pnpm dev
```

### 构建

```bash
# 构建前端产物
pnpm build

# 构建打包后的桌面应用
pnpm tauri:build
```

### 项目结构

```
repo-zero/
├── src/                      # 前端（React + TypeScript）
│   ├── App.tsx               # 主向导流程
│   ├── components/           # UI 组件（步骤、面板、控件）
│   ├── hooks/                # 自定义 React Hooks
│   ├── i18n/                 # 国际化（en、zh-CN）
│   ├── lib/                  # 工具库（日志存储、主题、运行时）
│   └── types/                # TypeScript 类型定义
├── src-tauri/                # 后端（Rust + Tauri v2）
│   ├── src/lib.rs            # Tauri 命令（scan_repo、execute_reset）
│   ├── src/main.rs           # 入口文件
│   ├── tauri.conf.json       # Tauri 配置
│   └── capabilities/         # 权限能力配置
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

### 技术栈

| 层级       | 技术                                     |
|------------|------------------------------------------|
| 前端       | React 18、TypeScript、Vite、Tailwind CSS |
| 后端       | Rust、Tauri v2                           |
| UI 组件库  | Radix UI、shadcn/ui、Lucide icons        |
| 终端       | xterm.js                                 |
| 国际化     | i18next、react-i18next                   |

### 可用脚本

| 脚本               | 说明                         |
|--------------------|------------------------------|
| `pnpm dev`         | 启动 Vite 开发服务器         |
| `pnpm build`       | 类型检查并构建前端产物       |
| `pnpm tauri:dev`   | 启动 Tauri 桌面应用（开发模式）|
| `pnpm tauri:build` | 构建打包后的桌面应用         |
| `pnpm lint`        | 运行 Biome 代码检查          |
| `pnpm lint:fix`    | 运行 Biome 代码检查并自动修复|
| `pnpm format`      | 使用 Biome 格式化代码        |

## 参与贡献

欢迎贡献代码。开始之前：

1. Fork 本仓库。
2. 创建功能分支（`git checkout -b feature/my-change`）。
3. 完成修改并确认构建通过（`pnpm build`）。
4. 提交 Pull Request。

本项目使用 [Changesets](https://github.com/changesets/changesets) 进行版本
管理。如果你的修改影响到面向用户的功能，请运行 `pnpm changeset` 记录变更。

## 许可证

[MIT](LICENSE) — Copyright (c) 2026 XSIJIE975
