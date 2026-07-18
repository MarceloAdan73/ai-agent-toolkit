<div align="center">

# AI Agent Toolkit

**Suite de agentes CLI impulsados por IA para automatizar el ciclo de desarrollo de software.**

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)
![Tests](https://img.shields.io/badge/tests-596%20passing-brightgreen)
![Agents](https://img.shields.io/badge/agents-5-active-brightgreen)
![CI](https://img.shields.io/badge/CI-GitHub%20Actions-blue)
![Providers](https://img.shields.io/badge/AI%20Providers-5-orange)
![PRs](https://img.shields.io/badge/PRs-welcome-brightgreen)
![Build](https://img.shields.io/badge/build-passing-brightgreen)

---

</div>

## Que es

AI Agent Toolkit es un **monorepo** que agrupa 5 agentes de IA independientes, cada uno especializado en una tarea del desarrollo. Comparten un CLI unificado, stack común y soportan múltiples proveedores de IA.

```bash
npx ai-toolkit doc       ./src   # documentacion automatica
npx ai-toolkit test      ./src   # pruebas unitarias
npx ai-toolkit review    ./src   # code review
npx ai-toolkit refactor  ./src   # refactorizacion
npx ai-toolkit audit     ./src   # auditoria de seguridad
```

---

## Agentes

| Comando | Paquete | Version | Descripcion |
|:-------:|---------|:-------:|-------------|
| `ai-toolkit doc` | [`agent-doc-generator`](./agent-doc-generator/) | v2.2.0 | Genera documentacion JSDoc automatica |
| `ai-toolkit test` | [`agent-test-generator`](./agent-test-generator/) | v2.1.0 | Genera pruebas unitarias con Vitest |
| `ai-toolkit review` | [`agent-code-review`](./agent-code-review/) | v1.1.0 | Analiza calidad y Complejidad ciclomatica |
| `ai-toolkit refactor` | [`agent-refactor`](./agent-refactor/) | v1.1.0 | Sugiere y aplica refactorizaciones con diffs |
| `ai-toolkit audit` | [`agent-security-audit`](./agent-security-audit/) | v1.1.0 | Auditoria de seguridad OWASP Top 10 |

> Cada agente es un paquete npm independiente. Instalalos por separado o usa el CLI unificado.

---

## Proveedores de IA

Soporta 5 proveedores con **auto-deteccion automatica**. Si no especificas `--provider`, el toolkit detecta que tienes configurado.

| Provider | Modelo Default | Auth | Notas |
|----------|---------------|------|-------|
| **Gemini** | `gemini-2.5-flash` | `GEMINI_API_KEY` | Free tier disponible |
| **OpenAI** | `gpt-4o` | `OPENAI_API_KEY` | GPT-4o, GPT-4o-mini |
| **Anthropic** | `claude-sonnet-4-20250514` | `ANTHROPIC_API_KEY` | Mejor para coding |
| **DeepSeek** | `deepseek-chat` | `DEEPSEEK_API_KEY` | Mas economico |
| **Ollama** | modelo local | Sin key | Local, gratis, privacidad total |

**Prioridad de deteccion:** OpenAI > Anthropic > DeepSeek > Gemini > Ollama

```bash
# Especificar provider explicitamente
npx ai-toolkit doc --path ./src --provider openai
npx ai-toolkit audit --path ./src --provider ollama --model qwen2.5-coder:7b
```

---

## Quick Start

### Desde npm (publicado)

```bash
npm install -g ai-toolkit
npx ai-toolkit doc --path ./src
```

### Desde el repositorio

```bash
git clone https://github.com/MarceloAdan73/ai-agent-toolkit.git
cd ai-agent-toolkit
npm install && npm run build

# Configurar un provider
cp .env.example .env
# Editar .env con tu API key

# Ejecutar
node toolkit/dist/cli.js doc --path ./src
```

---

## Arquitectura

```
ai-agent-toolkit/
├── package.json                 # npm workspaces
├── toolkit/                     # CLI unificado (ai-toolkit)
│   └── src/cli.ts
├── agent-doc-generator/         # documentacion
├── agent-test-generator/        # pruebas unitarias
├── agent-code-review/           # code review
├── agent-refactor/              # refactorizacion
└── agent-security-audit/        # auditoria OWASP
```

Cada agente contiene: `src/` (logica), `tests/` (Vitest), `index.ts` (entry point), `package.json` (bin, files, engines).

---

## Stack

| Capa | Tecnologia |
|------|------------|
| Lenguaje | TypeScript (strict mode) |
| Runtime | Node.js >= 18 (ES Modules) |
| IA Providers | Gemini, OpenAI, Anthropic, DeepSeek, Ollama |
| CLI | Commander.js |
| Progress UI | ora |
| Testing | Vitest (596 tests) |
| CI/CD | GitHub Actions |
| Bundling | tsc (TypeScript compiler) |

---

## CLI Flags

| Flag | Descripcion | Default |
|------|-------------|---------|
| `--path` | Archivo o carpeta a procesar | *(requerido)* |
| `--provider` | `gemini` \| `openai` \| `anthropic` \| `deepseek` \| `ollama` | auto-detectado |
| `--model` | Modelo a usar | segun provider |
| `--base-url` | URL del servidor (Ollama) | `http://localhost:11434` |
| `--api-key` | API key (opcional para Ollama) | `.env` |
| `--max-chars` | Limite de chars por archivo | `15000` |
| `--output` | Carpeta/archivo de salida | junto al archivo |
| `--extensions` | Extensiones a procesar (CSV) | todas |
| `--split` | Un archivo por cada fuente | `false` |
| `--format` | `terminal` \| `markdown` \| `html` \| `pdf` | `terminal` |
| `--severity` | Severidad minima (audit) | `info` |
| `--dry-run` | Solo preview, no escribir | `false` |
| `--verbose` | Logs detallados | `false` |

---

## Features

- **Multi-provider** — 5 proveedores de IA con auto-deteccion
- **Cache inteligente** — hash MD5, no regenera archivos sin cambios
- **Resiliencia** — 3 reintentos con backoff ante errores de API
- **Truncado seguro** — archivos grandes se recortan con aviso
- **Filtro por extension** — `--extensions .ts,.prisma` para limitar scope
- **Exportacion** — terminal, Markdown, HTML o PDF
- **Dry-run** — preview antes de escribir cambios
- **Modo split** — un archivo de salida por cada fuente analizada

---

## Scripts

```bash
npm run build            # build de todos los packages
npm run test             # 596 tests
npm run typecheck        # typecheck estricto
npm run test:integration # tests con providers reales (requiere API keys)
```

---

## Roadmap

- [x] 5 agentes funcionales con 596 tests
- [x] CLI unificado `ai-toolkit`
- [x] Multi-provider + auto-deteccion
- [x] Cache de respuestas
- [x] Exportacion HTML/PDF
- [x] CI/CD con GitHub Actions
- [x] Preparado para publicacion npm
- [ ] Publicar en npm
- [ ] Tests de integracion con providers reales
- [ ] Configuracion via archivos `.rc`

---

## Contributing

Las contributions son bienvenidas. Abre un issue o un PR.

```bash
git clone https://github.com/MarceloAdan73/ai-agent-toolkit.git
cd ai-agent-toolkit
npm install
npm run test   # verifica que todo pase antes de PR
```

---

## License

[MIT](./LICENSE) — Marcelo Adan

---

<div align="center">

**[GitHub](https://github.com/MarceloAdan73)** · **[Reportar Bug](https://github.com/MarceloAdan73/ai-agent-toolkit/issues)** · **[Request Feature](https://github.com/MarceloAdan73/ai-agent-toolkit/issues)**

</div>
