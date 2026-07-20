#!/usr/bin/env node

import { spawn } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const AGENTS: Record<string, string> = {
  doc: '@marcelo/agent-doc-generator',
  review: '@marcelo/agent-code-review',
  test: '@marcelo/agent-test-generator',
  refactor: '@marcelo/agent-refactor',
  audit: '@marcelo/agent-security-audit',
};

const VERSION = '1.0.0';

function showGeneralHelp(): void {
  console.log(`
AI Agent Toolkit v${VERSION}
Uso: ai-toolkit <comando> [opciones]

Comandos:
  doc       Generar documentación del código
            Ej: ai-toolkit doc --path ./src

  review    Revisar calidad del código
            Ej: ai-toolkit review --path ./src --format html

  test      Generar tests unitarios
            Ej: ai-toolkit test --path ./src

  refactor  Sugerir y aplicar refactorizaciones
            Ej: ai-toolkit refactor --path ./src --apply

  audit     Auditar seguridad (OWASP Top 10)
            Ej: ai-toolkit audit --path ./src --severity critical

Opciones generales:
  --help, -h    Muestra ayuda
  --version, -v Muestra versión

Más información:
  ai-toolkit <comando> --help
`);
}

const subcommand = process.argv[2];

if (!subcommand || subcommand === '--help' || subcommand === '-h') {
  showGeneralHelp();
  process.exit(0);
}

if (subcommand === '--version' || subcommand === '-v') {
  console.log(VERSION);
  process.exit(0);
}

const agentName = AGENTS[subcommand];
if (!agentName) {
  console.error(`Comando desconocido: "${subcommand}". Usa "ai-toolkit --help" para ver los comandos disponibles.`);
  process.exit(1);
}

const agentEntry = require.resolve(`${agentName}/dist/index.js`);
const childArgs = process.argv.slice(3);

const child = spawn(process.execPath, [agentEntry, ...childArgs], { stdio: 'inherit' });

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
