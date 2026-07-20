# agent-refactor

Sugiere y aplica refactorizaciones de código usando IA.

## Instalación

```bash
# Global
npm install -g @npm7381/agent-refactor

# O sin instalar
npx @npm7381/agent-refactor --path ./src
```

## Uso

```bash
agent-refactor --path ./src                              # refactorizar todo src/
agent-refactor --path ./src/utils.ts                     # un solo archivo
agent-refactor --path ./src --apply                      # aplicar cambios (crea backups)
agent-refactor --path ./src --extensions .ts,.prisma     # solo archivos .ts y .prisma
agent-refactor --path ./src --format html                # salida HTML
agent-refactor --path ./src --dry-run                    # preview sin escribir
agent-refactor --path ./src --verbose                    # logs detallados
```

## Proveedores

| Provider | Modelo Default | Auth | Notas |
|----------|---------------|------|-------|
| gemini | `gemini-2.5-flash` | `GEMINI_API_KEY` | Free tier disponible |
| openai | `gpt-4o` | `OPENAI_API_KEY` | GPT-4o, GPT-4o-mini |
| anthropic | `claude-sonnet-4-20250514` | `ANTHROPIC_API_KEY` | Claude |
| deepseek | `deepseek-chat` | `DEEPSEEK_API_KEY` | El más barato |
| ollama | modelo instalado | Sin key | Local, gratis, privacidad |

**Auto-detección**: Si no especificas `--provider`, detecta automáticamente qué tienes configurado (keys en `.env` o Ollama corriendo).

## Flags

| Flag | Descripción | Default |
|------|-------------|---------|
| `--path` | Archivo o carpeta a procesar | (requerido) |
| `--provider` | `gemini` \| `openai` \| `anthropic` \| `deepseek` \| `ollama` | auto-detectado |
| `--model` | Modelo a usar | según provider |
| `--base-url` | URL del servidor (Ollama) | `http://localhost:11434` |
| `--api-key` | API key (opcional para Ollama) | .env |
| `--max-chars` | Límite de chars por archivo | 15000 |
| `--output` | Carpeta/archivo de salida | junto al archivo |
| `--extensions` | Extensiones a procesar (CSV: `.ts,.prisma`) | todas |
| `--format` | Formato de salida `terminal` \| `markdown` \| `html` \| `pdf` | terminal |
| `--apply` | Aplicar cambios (crea backups automáticos) | false |
| `--dry-run` | Solo preview, no escribir | false |
| `--verbose` | Logs detallados | false |

## Features

- **Sugerencias con before/after diffs**: muestra código original y propuesto
- **Modo --apply**: aplica cambios automáticamente con backups
- **Cache**: hash MD5 para no regenerar archivos sin cambios
- **Auto-detección**: detecta provider disponible al iniciar
- **Resiliencia**: 3 reintentos con backoff ante errores de API
- **Truncado**: archivos > `--max-chars` se recortan con aviso
- **Filtro por extensión**: `--extensions .ts,.prisma` para limitar tipos de archivo

## Requisitos

- Node.js >= 18
- Un proveedor de IA configurado (API key o Ollama local)

## Licencia

MIT

Parte de [AI Agent Toolkit](https://github.com/MarceloAdan73/ai-agent-toolkit).
