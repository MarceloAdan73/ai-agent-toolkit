#!/usr/bin/env node

import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const AGENTS: Record<string, string> = {
  doc: 'agent-doc-generator',
  review: 'agent-code-review',
  test: 'agent-test-generator',
  refactor: 'agent-refactor',
  audit: 'agent-security-audit',
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

const agentEntry = resolve(__dirname, '..', '..', 'node_modules', agentName, 'dist', 'index.js');
const childArgs = process.argv.slice(3);

const child = spawn(process.execPath, [agentEntry, ...childArgs], { stdio: 'inherit' });

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
