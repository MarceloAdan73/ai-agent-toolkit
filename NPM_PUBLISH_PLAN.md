# NPM PUBLISH PLAN - ai-agent-toolkit

**Fecha:** 20/07/2026
**Objetivo:** Publicar 6 paquetes en npm bajo el scope `@marcelo/`
**Autor:** Marcelo Adan

---

## Configuracion Elegida

| Decision | Valor |
|----------|-------|
| Namespace | `@marcelo/` |
| Version inicial | `1.0.0` (todos los paquetes) |
| Paquetes a publicar | 6 (5 agentes + 1 toolkit unificado) |
| Rama de trabajo | `dev` (crear desde `main`) |

---

## Paquetes a Publicar

| Paquete npm | Directorio | Descripcion |
|-------------|-----------|-------------|
| `@marcelo/agent-doc-generator` | `agent-doc-generator/` | Generador de documentacion con IA |
| `@marcelo/agent-test-generator` | `agent-test-generator/` | Generador de tests unitarios con IA |
| `@marcelo/agent-code-review` | `agent-code-review/` | Revision de codigo con IA |
| `@marcelo/agent-refactor` | `agent-refactor/` | Herramienta de refactorizacion con IA |
| `@marcelo/agent-security-audit` | `agent-security-audit/` | Auditoria de seguridad OWASP con IA |
| `@marcelo/ai-agent-toolkit` | `toolkit/` | CLI unificada que engloba los 5 agentes |

---

## FASE 1: Crear rama dev

```bash
# Desde la raiz del proyecto
git checkout -b dev
```

Verificar:
```bash
git branch
# Debe mostrar: * dev
```

---

## FASE 2: Corregir toolkit/src/cli.ts

**Archivo:** `toolkit/src/cli.ts`
**Problema:** Linea 67 resuelve agentes con path hardcodeado que no funciona cuando se instala via npm.
**Solucion:** Usar `createRequire` para resolver paquetes instalados.

### Cambio exacto

**ANTES (lineas 1-7):**
```typescript
#!/usr/bin/env node

import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
```

**DESPUES (lineas 1-8):**
```typescript
#!/usr/bin/env node

import { spawn } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
```

---

**ANTES (linea 67):**
```typescript
const agentEntry = resolve(__dirname, '..', '..', 'node_modules', agentName, 'dist', 'index.js');
```

**DESPUES (linea 69):**
```typescript
const agentEntry = require.resolve(`${agentName}/dist/index.js`);
```

### Por que funciona

- `createRequire(import.meta.url)` crea una funcion `require` que resuelve paquetes desde la ubicacion del archivo actual
- `require.resolve('agent-doc-generator/dist/index.js')` encuentra el paquete en node_modules sin importar donde este instalado
- Funciona tanto en monorepo local como cuando se instala globalmente via npm

---

## FASE 3: Corregir toolkit/package.json

**Archivo:** `toolkit/package.json`

### Contenido completo nuevo

```json
{
  "name": "@marcelo/ai-agent-toolkit",
  "version": "1.0.0",
  "description": "AI Agent Toolkit - CLI unificada para herramientas de desarrollo impulsadas por IA",
  "type": "module",
  "bin": {
    "ai-toolkit": "./dist/cli.js"
  },
  "files": ["dist/", "README.md", "LICENSE"],
  "engines": { "node": ">=18" },
  "scripts": {
    "build": "tsc",
    "start": "node dist/cli.js",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "@marcelo/agent-doc-generator": "^1.0.0",
    "@marcelo/agent-test-generator": "^1.0.0",
    "@marcelo/agent-code-review": "^1.0.0",
    "@marcelo/agent-refactor": "^1.0.0",
    "@marcelo/agent-security-audit": "^1.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.7.0"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/MarceloAdan73/ai-agent-toolkit",
    "directory": "toolkit"
  },
  "keywords": ["ai", "cli", "toolkit", "agents", "code-generation", "documentation", "testing", "code-review", "security"],
  "author": "Marcelo Adan",
  "license": "MIT",
  "homepage": "https://github.com/MarceloAdan73/ai-agent-toolkit"
}
```

### Cambios realizados

| Campo | Antes | Despues | Por que |
|-------|-------|---------|---------|
| `name` | `ai-toolkit` | `@marcelo/ai-agent-toolkit` | Namespace unico |
| `files` | (no existia) | `["dist/", "README.md", "LICENSE"]` | Solo publicar lo necesario |
| `engines` | (no existia) | `{ "node": ">=18" }` | Requisito minimo |
| `dependencies` | `"agent-doc-generator": "*"` | `"@marcelo/agent-doc-generator": "^1.0.0"` | Versiones reales |
| `prepublishOnly` | (no existia) | `"npm run build"` | Build automatico antes de publicar |
| `repository` | (no existia) | Con `directory` | Link al repo correcto |
| `keywords` | (no existia) | Array de keywords | Discoverability en npm |

---

## FASE 4: Cambiar nombres en los 5 agentes

Cada agente necesita: nombre `@marcelo/`, version `1.0.0`, y campos faltantes.

### 4.1 agent-doc-generator/package.json

**Contenido completo nuevo:**
```json
{
  "name": "@marcelo/agent-doc-generator",
  "version": "1.0.0",
  "description": "AI-powered documentation generator for codebases",
  "main": "dist/index.js",
  "bin": {
    "agent-doc-generator": "./dist/index.js"
  },
  "files": ["dist/", "README.md", "LICENSE"],
  "engines": { "node": ">=18" },
  "type": "module",
  "license": "MIT",
  "author": "Marcelo Adan",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx index.ts",
    "doc": "node dist/index.js --path .",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "test:integration": "vitest run tests/providerIntegration.test.ts",
    "prepublishOnly": "npm run build"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/MarceloAdan73/ai-agent-toolkit",
    "directory": "agent-doc-generator"
  },
  "keywords": ["ai", "documentation", "jsdoc", "code-generation", "documentation-generator"],
  "dependencies": {
    "@google/genai": "^1.52.0",
    "commander": "^12.1.0",
    "dotenv": "^16.4.7",
    "ora": "^9.4.1",
    "pdfkit": "^0.19.1"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/pdfkit": "^0.17.6",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^3.1.1"
  }
}
```

### 4.2 agent-test-generator/package.json

**Contenido completo nuevo:**
```json
{
  "name": "@marcelo/agent-test-generator",
  "version": "1.0.0",
  "description": "AI-powered unit test generator using Vitest",
  "main": "dist/index.js",
  "bin": {
    "agent-test-generator": "./dist/index.js"
  },
  "files": ["dist/", "README.md", "LICENSE"],
  "engines": { "node": ">=18" },
  "type": "module",
  "license": "MIT",
  "author": "Marcelo Adan",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx index.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "test:integration": "vitest run tests/providerIntegration.test.ts",
    "prepublishOnly": "npm run build"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/MarceloAdan73/ai-agent-toolkit",
    "directory": "agent-test-generator"
  },
  "keywords": ["ai", "testing", "unit-tests", "vitest", "test-generation", "code-generation"],
  "dependencies": {
    "@google/genai": "^1.52.0",
    "commander": "^12.1.0",
    "dotenv": "^16.4.7",
    "ora": "^9.4.1",
    "pdfkit": "^0.19.1"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/pdfkit": "^0.17.6",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^3.1.1"
  }
}
```

### 4.3 agent-code-review/package.json

**Contenido completo nuevo:**
```json
{
  "name": "@marcelo/agent-code-review",
  "version": "1.0.0",
  "description": "AI-powered code review tool that analyzes code quality and suggests improvements",
  "main": "dist/index.js",
  "bin": {
    "agent-code-review": "./dist/index.js"
  },
  "files": ["dist/", "README.md", "LICENSE"],
  "engines": { "node": ">=18" },
  "type": "module",
  "license": "MIT",
  "author": "Marcelo Adan",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx index.ts",
    "review": "node dist/index.js --path .",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "test:integration": "vitest run tests/providerIntegration.test.ts",
    "prepublishOnly": "npm run build"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/MarceloAdan73/ai-agent-toolkit",
    "directory": "agent-code-review"
  },
  "keywords": ["ai", "code-review", "code-quality", "static-analysis", "code-review-tool"],
  "dependencies": {
    "@google/genai": "^1.52.0",
    "commander": "^12.1.0",
    "dotenv": "^16.4.7",
    "ora": "^9.4.1",
    "pdfkit": "^0.19.1"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/pdfkit": "^0.17.6",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^3.1.1"
  }
}
```

### 4.4 agent-refactor/package.json

**Contenido completo nuevo:**
```json
{
  "name": "@marcelo/agent-refactor",
  "version": "1.0.0",
  "description": "AI-powered refactoring tool that suggests and applies code refactorizations",
  "main": "dist/index.js",
  "bin": {
    "agent-refactor": "./dist/index.js"
  },
  "files": ["dist/", "README.md", "LICENSE"],
  "engines": { "node": ">=18" },
  "type": "module",
  "license": "MIT",
  "author": "Marcelo Adan",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx index.ts",
    "refactor": "node dist/index.js --path .",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "test:integration": "vitest run tests/providerIntegration.test.ts",
    "prepublishOnly": "npm run build"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/MarceloAdan73/ai-agent-toolkit",
    "directory": "agent-refactor"
  },
  "keywords": ["ai", "refactoring", "code-quality", "refactor", "code-refactoring"],
  "dependencies": {
    "@google/genai": "^1.52.0",
    "commander": "^12.1.0",
    "dotenv": "^16.4.7",
    "ora": "^9.4.1",
    "pdfkit": "^0.19.1"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/pdfkit": "^0.17.6",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^3.1.1"
  }
}
```

### 4.5 agent-security-audit/package.json

**Contenido completo nuevo:**
```json
{
  "name": "@marcelo/agent-security-audit",
  "version": "1.0.0",
  "description": "AI-powered security audit tool that analyzes source code for vulnerabilities (OWASP Top 10)",
  "main": "dist/index.js",
  "bin": {
    "agent-security-audit": "./dist/index.js"
  },
  "files": ["dist/", "README.md", "LICENSE"],
  "engines": { "node": ">=18" },
  "type": "module",
  "license": "MIT",
  "author": "Marcelo Adan",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx index.ts",
    "audit": "node dist/index.js --path .",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "test:integration": "vitest run tests/providerIntegration.test.ts",
    "prepublishOnly": "npm run build"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/MarceloAdan73/ai-agent-toolkit",
    "directory": "agent-security-audit"
  },
  "keywords": ["ai", "security", "audit", "owasp", "vulnerability-scanning", "code-security"],
  "dependencies": {
    "@google/genai": "^1.52.0",
    "commander": "^12.1.0",
    "dotenv": "^16.4.7",
    "ora": "^9.4.1",
    "pdfkit": "^0.19.1"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/pdfkit": "^0.17.6",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^3.1.1"
  }
}
```

### Resumen de cambios por agente

| Agente | Campo `name` | Campo `version` | Campo `repository.directory` |
|--------|-------------|----------------|------------------------------|
| agent-doc-generator | `@marcelo/agent-doc-generator` | `1.0.0` | `"directory": "agent-doc-generator"` |
| agent-test-generator | `@marcelo/agent-test-generator` | `1.0.0` | `"directory": "agent-test-generator"` |
| agent-code-review | `@marcelo/agent-code-review` | `1.0.0` | `"directory": "agent-code-review"` |
| agent-refactor | `@marcelo/agent-refactor` | `1.0.0` | `"directory": "agent-refactor"` |
| agent-security-audit | `@marcelo/agent-security-audit` | `1.0.0` | `"directory": "agent-security-audit"` |

---

## FASE 5: Actualizar package.json raiz

**Archivo:** `package.json` (raiz)

### Contenido completo nuevo

```json
{
  "name": "@marcelo/ai-agent-toolkit-monorepo",
  "version": "1.0.0",
  "description": "Monorepo de agentes de IA para automatizar tareas de desarrollo",
  "private": true,
  "type": "module",
  "workspaces": [
    "agent-doc-generator",
    "agent-test-generator",
    "agent-code-review",
    "agent-refactor",
    "agent-security-audit",
    "toolkit"
  ],
  "scripts": {
    "build": "npm -ws run build",
    "test": "npm -ws --if-present run test",
    "typecheck": "npm -ws run typecheck",
    "test:integration": "npm -ws --if-present run test:integration",
    "doc": "node toolkit/dist/cli.js doc --path .",
    "review": "node toolkit/dist/cli.js review --path .",
    "test-gen": "node toolkit/dist/cli.js test --path .",
    "refactor": "node toolkit/dist/cli.js refactor --path .",
    "audit": "node toolkit/dist/cli.js audit --path ."
  },
  "author": "Marcelo Adan",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/MarceloAdan73/ai-agent-toolkit"
  },
  "homepage": "https://github.com/MarceloAdan73/ai-agent-toolkit"
}
```

### Cambios

- `name`: `"ai-agent-toolkit"` -> `"@marcelo/ai-agent-toolkit-monorepo"` (no se publica, es privado, pero actualizado por consistencia)

---

## FASE 6: Copiar LICENSE a cada workspace

El LICENSE ya existe en la raiz. Copiarlo a cada workspace para que `npm pack` lo incluya.

```bash
# Desde la raiz del proyecto
cp LICENSE agent-doc-generator/LICENSE
cp LICENSE agent-test-generator/LICENSE
cp LICENSE agent-code-review/LICENSE
cp LICENSE agent-refactor/LICENSE
cp LICENSE agent-security-audit/LICENSE
cp LICENSE toolkit/LICENSE
```

---

## FASE 7: Verificar build + tests

Ejecutar en orden:

```bash
# 1. Build completo de todos los workspaces
npm run build

# 2. Typecheck completo
npm run typecheck

# 3. Tests completos (596 tests)
npm test
```

Si algun paso falla, **NO continuar**. Corregir el error primero.

---

## FASE 8: Verificar empaquetado (dry-run)

```bash
# Verificar que cada paquete se empaqueta correctamente
npm pack --dry-run -w agent-doc-generator
npm pack --dry-run -w agent-test-generator
npm pack --dry-run -w agent-code-review
npm pack --dry-run -w agent-refactor
npm pack --dry-run -w agent-security-audit
npm pack --dry-run -w toolkit
```

### Que verificar en cada output

- [ ] El nombre del paquete empieza con `@marcelo/`
- [ ] La version es `1.0.0`
- [ ] Incluye `dist/` (archivos compilados)
- [ ] Incluye `README.md`
- [ ] Incluye `LICENSE`
- [ ] **NO** incluye `src/` (archivos fuente)
- [ ] **NO** incluye `tests/`
- [ ] **NO** incluye `node_modules/`
- [ ] El tamano total es razonable (agentes ~100kB, toolkit ~10kB)

---

## FASE 9: Commit + push dev

```bash
# Ver estado
git status

# Agregar todos los cambios
git add .

# Commit
git commit -m "feat: prepare for npm publishing under @marcelo scope

- Add @marcelo/ namespace to all 6 packages
- Fix toolkit agent resolution (createRequire instead of hardcoded path)
- Set all versions to 1.0.0
- Add missing fields: files, engines, repository, keywords, prepublishOnly
- Add LICENSE to each workspace"

# Push dev
git push -u origin dev
```

---

## FASE 10: Merge dev -> main

```bash
# Cambiar a main
git checkout main

# Merge dev
git merge dev

# Push main
git push origin main

# (Opcional) Eliminar rama dev local
git branch -d dev
```

---

## FASE 11: Publicar en npm

### Paso 1: Login (una vez)

```bash
npm login
# Seguir instrucciones en pantalla
# Verificar:
npm whoami
# Debe mostrar: MarceloAdan73
```

### Paso 2: Verificar que el scope esta disponible

```bash
# Esto fallara si el scope ya esta registrado por otro usuario
# Si falla, usar un nombre alternativo
npm init --scope=marcelo --dry-run
```

### Paso 3: Publicar agentes (en orden)

```bash
# Publicar cada agente individualmente
npm publish -w agent-doc-generator --access public
npm publish -w agent-test-generator --access public
npm publish -w agent-code-review --access public
npm publish -w agent-refactor --access public
npm publish -w agent-security-audit --access public
```

### Paso 4: Publicar toolkit

```bash
# El toolkit depende de los agentes, publicar despues
npm publish -w toolkit --access public
```

### Nota sobre `--access public`

Los paquetes con scope (`@marcelo/`) son **privados por defecto** en npm. El flag `--access public` los hace visibles publicamente. Sin este flag, la publicacion fallara con un error de permisos.

---

## FASE 12: Post-publicacion

### Verificar instalacion global

```bash
# Instalar el toolkit globalmente
npm install -g @marcelo/ai-agent-toolkit

# Verificar que funciona
ai-toolkit --help
ai-toolkit --version
```

### Verificar con npx

```bash
# Probar cada agente sin instalar globalmente
npx @marcelo/agent-doc-generator --help
npx @marcelo/agent-test-generator --help
npx @marcelo/agent-code-review --help
npx @marcelo/agent-refactor --help
npx @marcelo/agent-security-audit --help
```

### Verificar en npmjs.com

Abrir en navegador:
- https://www.npmjs.com/package/@marcelo/agent-doc-generator
- https://www.npmjs.com/package/@marcelo/agent-test-generator
- https://www.npmjs.com/package/@marcelo/agent-code-review
- https://www.npmjs.com/package/@marcelo/agent-refactor
- https://www.npmjs.com/package/@marcelo/agent-security-audit
- https://www.npmjs.com/package/@marcelo/ai-agent-toolkit

### Tag de Git

```bash
git tag v1.0.0
git push origin v1.0.0
```

### Actualizar README principal

Agregar badges de npm en `README.md` raiz:

```markdown
[![npm](https://img.shields.io/npm/v/@marcelo/ai-agent-toolkit?style=flat-square&label=ai-agent-toolkit)](https://www.npmjs.com/package/@marcelo/ai-agent-toolkit)
[![npm](https://img.shields.io/npm/v/@marcelo/agent-doc-generator?style=flat-square&label=doc-generator)](https://www.npmjs.com/package/@marcelo/agent-doc-generator)
[![npm](https://img.shields.io/npm/v/@marcelo/agent-test-generator?style=flat-square&label=test-generator)](https://www.npmjs.com/package/@marcelo/agent-test-generator)
[![npm](https://img.shields.io/npm/v/@marcelo/agent-code-review?style=flat-square&label=code-review)](https://www.npmjs.com/package/@marcelo/agent-code-review)
[![npm](https://img.shields.io/npm/v/@marcelo/agent-refactor?style=flat-square&label=refactor)](https://www.npmjs.com/package/@marcelo/agent-refactor)
[![npm](https://img.shields.io/npm/v/@marcelo/agent-security-audit?style=flat-square&label=security-audit)](https://www.npmjs.com/package/@marcelo/agent-security-audit)
```

---

## CHECKLIST DE VERIFICACION

Antes de publicar, confirmar cada item:

### Codigo
- [ ] `npm run build` completa sin errores
- [ ] `npm run typecheck` pasa sin errores
- [ ] `npm test` pasa los 596 tests
- [ ] `toolkit/src/cli.ts` usa `createRequire` (no path hardcodeado)

### package.json
- [ ] Todos los `name` empiezan con `@marcelo/`
- [ ] Todos los `version` son `1.0.0`
- [ ] Todos tienen `files`, `engines`, `repository`, `keywords`
- [ ] Todos tienen `prepublishOnly: "npm run build"`
- [ ] `toolkit/package.json` tiene dependencias con `^1.0.0` (no `*`)
- [ ] `package.json` raiz tiene `"private": true`

### Archivos
- [ ] LICENSE existe en cada workspace
- [ ] `npm pack --dry-run` muestra solo `dist/`, `README.md`, `LICENSE`
- [ ] Ningun `src/` o `tests/` se incluye en el paquete

### Git
- [ ] Todos los cambios estan committeados en `dev`
- [ ] `dev` tiene merge exitoso a `main`
- [ ] `main` esta pushed a origin

---

## COMANDOS DE REFERENCIA RAPIDA

```bash
# === DESARROLLO ===
git checkout -b dev          # Crear rama dev
npm run build                # Build todos los workspaces
npm run typecheck            # Typecheck todos
npm test                     # Ejecutar 596 tests
npm pack --dry-run           # Verificar empaquetado

# === PUBLICACION ===
npm login                    # Autenticarse en npm
npm whoami                   # Verificar usuario
npm publish -w <workspace> --access public  # Publicar un workspace
npm publish -w agent-doc-generator --access public
npm publish -w agent-test-generator --access public
npm publish -w agent-code-review --access public
npm publish -w agent-refactor --access public
npm publish -w agent-security-audit --access public
npm publish -w toolkit --access public

# === VERIFICACION ===
npm install -g @marcelo/ai-agent-toolkit
ai-toolkit --help
npx @marcelo/agent-doc-generator --help

# === GIT ===
git add . && git commit -m "mensaje"
git push -u origin dev
git checkout main && git merge dev && git push
git tag v1.0.0 && git push origin v1.0.0
```

---

## ORDEN DE EJECUCION

```
FASE 1  Crear rama dev
  ↓
FASE 2  Corregir toolkit/src/cli.ts
  ↓
FASE 3  Corregir toolkit/package.json
  ↓
FASE 4  Cambiar nombres en los 5 agentes
  ↓
FASE 5  Actualizar package.json raiz
  ↓
FASE 6  Copiar LICENSE a cada workspace
  ↓
FASE 7  Verificar build + typecheck + tests
  ↓ (si falla, corregir y repetir FASE 7)
FASE 8  Verificar empaquetado dry-run
  ↓ (si falla, corregir y repetir FASE 8)
FASE 9  Commit + push dev
  ↓
FASE 10 Merge dev -> main + push
  ↓
FASE 11 Publicar en npm (requiere npm login)
  ↓
FASE 12 Post-publicacion (verificar + documentar)
```

---

---

## ESTADO DE AVANCE

**Ultima actualizacion:** 20/07/2026
**Rama activa:** `dev`
**Commit:** `7db2354` - "feat: prepare for npm publishing under @marcelo scope"

### Fases completadas

| Fase | Estado | Detalle |
|------|--------|---------|
| FASE 1 | COMPLETADA | Rama `dev` creada desde `main` |
| FASE 2 | COMPLETADA | `toolkit/src/cli.ts` corregido (createRequire) |
| FASE 3 | COMPLETADA | `toolkit/package.json` actualizado (campos + semver) |
| FASE 4 | COMPLETADA | 5 agentes: nombre `@marcelo/`, version `1.0.0` |
| FASE 5 | COMPLETADA | `package.json` raiz actualizado |
| FASE 6 | COMPLETADA | LICENSE copiado a los 6 workspaces |
| FASE 7 | COMPLETADA | `npm run build` OK, `npm run typecheck` OK, `npm test` 596/596 OK |
| FASE 8 | COMPLETADA | `npm pack --dry-run` verificado en los 6 paquetes |
| FASE 9 | COMPLETADA | Commit + push a `origin/dev` |
| FASE 9.5 | COMPLETADA | Test local: toolkit resuelve agentes OK, detecta Ollama |

### Fases pendientes

| Fase | Estado | Que hacer |
|------|--------|-----------|
| FASE 10 | PENDIENTE | Merge `dev` -> `main` + push |
| FASE 11 | PENDIENTE | `npm login` + publicar 6 paquetes |
| FASE 12 | PENDIENTE | Verificar en npmjs.com + tag + badges |

### Resumen de cambios aplicados

**Archivos modificados:**
- `toolkit/src/cli.ts` - createRequire + nombres `@marcelo/`
- `toolkit/package.json` - namespace, campos, semver
- `agent-doc-generator/package.json` - namespace, version, repository
- `agent-test-generator/package.json` - namespace, version, repository
- `agent-code-review/package.json` - namespace, version, repository
- `agent-refactor/package.json` - namespace, version, repository
- `agent-security-audit/package.json` - namespace, version, repository
- `package.json` (raiz) - nombre actualizado

**Archivos creados:**
- `NPM_PUBLISH_PLAN.md` (este archivo)
- `toolkit/LICENSE`
- `agent-doc-generator/LICENSE`
- `agent-test-generator/LICENSE`
- `agent-code-review/LICENSE`
- `agent-refactor/LICENSE`
- `agent-security-audit/LICENSE`

### Resultados de verificacion

| Check | Resultado |
|-------|-----------|
| Build | 6/6 workspaces OK |
| Typecheck | 6/6 workspaces OK |
| Tests | 596/596 tests passing (50 test files) |
| Dry-run pack agent-doc-generator | 24.3 kB, 47 archivos |
| Dry-run pack agent-test-generator | 24.3 kB, 47 archivos |
| Dry-run pack agent-code-review | 25.7 kB, 47 archivos |
| Dry-run pack agent-refactor | 26.7 kB, 47 archivos |
| Dry-run pack agent-security-audit | 26.5 kB, 47 archivos |
| Dry-run pack toolkit | 2.6 kB, 4 archivos |
| Toolkit --help | OK |
| Toolkit resuelve agentes | OK (probado con `doc --path`) |

---

*Archivo generado el 20/07/2026 por OpenCode.*
*Proyecto: ai-agent-toolkit*
*Estado: FASES 1-9.5 COMPLETADAS - LISTO PARA MERGE Y PUBLICACION*
