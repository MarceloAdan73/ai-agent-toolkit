<div align="center">

# 🤖 AI AGENT TOOLKIT

**🚀 Suite of 5 AI-powered CLI agents for automating software development workflows.**

[![CI](https://github.com/MarceloAdan73/ai-agent-toolkit/actions/workflows/ci.yml/badge.svg)](https://github.com/MarceloAdan73/ai-agent-toolkit/actions)
[![Version](https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge)](https://github.com/MarceloAdan73/ai-agent-toolkit)
[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=for-the-badge)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tests](https://img.shields.io/badge/tests-596%20passing-brightgreen?style=for-the-badge)](https://vitest.dev)
[![Agents](https://img.shields.io/badge/agents-5-active-brightgreen?style=for-the-badge)](#-agents)
[![Providers](https://img.shields.io/badge/AI%20Providers-5-orange?style=for-the-badge)](#-supported-ai-providers)
[![PRs](https://img.shields.io/badge/PRs-welcome-brightgreen?style=for-the-badge)](https://github.com/MarceloAdan73/ai-agent-toolkit/pulls)

[📦 Installation](#-installation) · [🤖 Agents](#-agents) · [🧠 Providers](#-supported-ai-providers) · [⚙️ CLI Flags](#%EF%B8%8F-cli-flags) · [🤝 Contributing](#-contributing)

</div>

---

## 📋 Overview

AI Agent Toolkit is a **monorepo** grouping 5 independent AI agents, each specialized in a different development task. They share a unified CLI, common stack, and support multiple AI providers.

```bash
npx ai-toolkit doc       ./src   # 📄 automatic documentation
npx ai-toolkit test      ./src   # 🧪 unit tests
npx ai-toolkit review    ./src   # 🔍 code review
npx ai-toolkit refactor  ./src   # ♻️ refactoring
npx ai-toolkit audit     ./src   # 🛡️ security audit
```

---

## 🤖 Agents

| Command | Package | Version | Description |
|:-------:|---------|:-------:|-------------|
| `ai-toolkit doc` | [`agent-doc-generator`](./agent-doc-generator/) | v2.2.0 | 📄 Generates JSDoc documentation automatically |
| `ai-toolkit test` | [`agent-test-generator`](./agent-test-generator/) | v2.1.0 | 🧪 Generates unit tests with Vitest |
| `ai-toolkit review` | [`agent-code-review`](./agent-code-review/) | v1.1.0 | 🔍 Analyzes code quality and cyclomatic complexity |
| `ai-toolkit refactor` | [`agent-refactor`](./agent-refactor/) | v1.1.0 | ♻️ Suggests and applies refactorizations with diffs |
| `ai-toolkit audit` | [`agent-security-audit`](./agent-security-audit/) | v1.1.0 | 🛡️ OWASP Top 10 security audit |

> 💡 Each agent is an independent npm package. Install them separately or use the unified CLI.

---

## 🧠 Supported AI Providers

Supports 5 providers with **automatic detection**. If you don't specify `--provider`, the toolkit detects what you have configured.

| Provider | Default Model | Auth | Notes |
|----------|--------------|------|-------|
| 🔷 **Gemini** | `gemini-2.5-flash` | `GEMINI_API_KEY` | Free tier available |
| 🟢 **OpenAI** | `gpt-4o` | `OPENAI_API_KEY` | GPT-4o, GPT-4o-mini |
| 🟠 **Anthropic** | `claude-sonnet-4-20250514` | `ANTHROPIC_API_KEY` | Best for coding |
| 🔵 **DeepSeek** | `deepseek-chat` | `DEEPSEEK_API_KEY` | Most affordable |
| 🦙 **Ollama** | local model | No key | Local, free, full privacy |

**🔍 Detection priority:** OpenAI > Anthropic > DeepSeek > Gemini > Ollama

```bash
# 🎯 Specify provider explicitly
npx ai-toolkit doc --path ./src --provider openai
npx ai-toolkit audit --path ./src --provider ollama --model qwen2.5-coder:7b
```

---

## 📦 Installation

### 🚀 From npm (published)

```bash
npm install -g ai-toolkit
npx ai-toolkit doc --path ./src
```

### 📥 From repository

```bash
git clone https://github.com/MarceloAdan73/ai-agent-toolkit.git
cd ai-agent-toolkit
npm install && npm run build

# ⚙️ Configure a provider
cp .env.example .env
# Edit .env with your API key

# ▶️ Run
node toolkit/dist/cli.js doc --path ./src
```

---

## 🏗️ Architecture

```
ai-agent-toolkit/
├── package.json                 # 📦 npm workspaces
├── toolkit/                     # 🖥️ Unified CLI (ai-toolkit)
│   └── src/cli.ts
├── agent-doc-generator/         # 📄 documentation
├── agent-test-generator/        # 🧪 unit tests
├── agent-code-review/           # 🔍 code review
├── agent-refactor/              # ♻️ refactoring
└── agent-security-audit/        # 🛡️ OWASP security audit
```

Each agent contains: `src/` (logic), `tests/` (Vitest), `index.ts` (entry point), `package.json` (bin, files, engines).

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| 💻 Language | TypeScript (strict mode) |
| ⚡ Runtime | Node.js >= 18 (ES Modules) |
| 🧠 AI Providers | Gemini, OpenAI, Anthropic, DeepSeek, Ollama |
| 🖥️ CLI | Commander.js |
| ⏳ Progress UI | ora |
| 🧪 Testing | Vitest (596 tests) |
| 🔄 CI/CD | GitHub Actions |
| 📦 Bundling | tsc (TypeScript compiler) |

---

## ⚙️ CLI Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--path` | 📁 File or folder to process | *(required)* |
| `--provider` | 🧠 `gemini` \| `openai` \| `anthropic` \| `deepseek` \| `ollama` | auto-detected |
| `--model` | 🤖 Model to use | per provider |
| `--base-url` | 🌐 Server URL (Ollama) | `http://localhost:11434` |
| `--api-key` | 🔑 API key (optional for Ollama) | `.env` |
| `--max-chars` | 📏 Character limit per file | `15000` |
| `--output` | 📂 Output folder/file | next to source |
| `--extensions` | 📎 Extensions to process (CSV) | all |
| `--split` | 📑 One file per source | `false` |
| `--format` | 📄 `terminal` \| `markdown` \| `html` \| `pdf` | `terminal` |
| `--severity` | ⚠️ Minimum severity (audit) | `info` |
| `--dry-run` | 👁️ Preview only, don't write | `false` |
| `--verbose` | 📝 Detailed logs | `false` |

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🧠 **Multi-provider** | 5 AI providers with auto-detection |
| 💾 **Smart cache** | MD5 hash, skips unchanged files |
| 🔄 **Resilience** | 3 retries with backoff on API errors |
| ✂️ **Safe truncation** | Large files trimmed with warning |
| 📎 **Extension filter** | `--extensions .ts,.prisma` to limit scope |
| 📄 **Export** | Terminal, Markdown, HTML or PDF |
| 👁️ **Dry-run** | Preview before writing changes |
| 📑 **Split mode** | One output file per analyzed source |

---

## 📜 Scripts

```bash
npm run build            # 🏗️ build all packages
npm run test             # 🧪 596 tests
npm run typecheck        # 🔍 strict typecheck
npm run test:integration # 🔗 tests with real providers (requires API keys)
```

---

## 🗺️ Roadmap

- [x] ✅ 5 functional agents with 596 tests
- [x] ✅ Unified CLI `ai-toolkit`
- [x] ✅ Multi-provider + auto-detection
- [x] ✅ Response caching
- [x] ✅ HTML/PDF export
- [x] ✅ CI/CD with GitHub Actions
- [x] ✅ Ready for npm publishing
- [ ] ⏳ Publish to npm
- [ ] ⏳ Integration tests with real providers
- [ ] ⏳ Configuration via `.rc` files

---

## 🤝 Contributing

Contributions are welcome! Open an issue or a PR.

```bash
# 1. 🍴 Fork
# 2. 🔀 Create branch
git checkout -b feature/new-feature

# 3. 💾 Commit
git commit -m 'Add new feature'

# 4. 📤 Push
git push origin feature/new-feature

# 5. 🔁 Pull Request
```

---

## 📄 License

[MIT](./LICENSE) — 🧑‍💻 Marcelo Adan

---

<div align="center">

**[🐙 GitHub](https://github.com/MarceloAdan73)** · **[🐛 Report Bug](https://github.com/MarceloAdan73/ai-agent-toolkit/issues)** · **[💡 Request Feature](https://github.com/MarceloAdan73/ai-agent-toolkit/issues)**

</div>
