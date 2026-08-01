#!/usr/bin/env node

import { spawn } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const AGENTS: Record<string, string> = {
  doc: '@aiagentkit/agent-doc-generator',
  review: '@aiagentkit/agent-code-review',
  test: '@aiagentkit/agent-test-generator',
  refactor: '@aiagentkit/agent-refactor',
  audit: '@aiagentkit/agent-security-audit',
};

const VERSION = '1.0.0';

function showGeneralHelp(): void {
  console.log(`
AI Agent Toolkit v${VERSION}
Usage: ai-toolkit <command> [options]

Commands:
  doc       Generate code documentation
            e.g. ai-toolkit doc --path ./src

  review    Review code quality
            e.g. ai-toolkit review --path ./src --format html

  test      Generate unit tests
            e.g. ai-toolkit test --path ./src

  refactor  Suggest and apply refactors
            e.g. ai-toolkit refactor --path ./src --apply

  audit     Security audit (OWASP Top 10)
            e.g. ai-toolkit audit --path ./src --severity critical

General options:
  --help, -h    Shows help
  --version, -v Shows version

More information:
  ai-toolkit <command> --help
`);
}

const subcommand = process.argv[2];

if (!subcommand || subcommand === '--help' || subcommand === '-h') {
  showGeneralHelp();
} else if (subcommand === '--version' || subcommand === '-v') {
  console.log(VERSION);
} else {
  runAgent(subcommand);
}

function runAgent(subcommand: string): void {
  const agentName = AGENTS[subcommand];
  if (!agentName) {
    console.error(`Unknown command: "${subcommand}". Run "ai-toolkit --help" to see available commands.`);
    process.exitCode = 1;
    return;
  }

  const agentEntry = require.resolve(`${agentName}/dist/index.js`);
  const childArgs = process.argv.slice(3);

  const child = spawn(process.execPath, [agentEntry, ...childArgs], { stdio: 'inherit' });

  // Usar 'close' (no 'exit') + process.exitCode: en Windows, process.exit()
  // inmediato tras el exit del child aborta con "Assertion failed:
  // !(handle->flags & UV_HANDLE_CLOSING)" porque quedan handles de libuv
  // cerrando (stdio heredado). Con exitCode el proceso sale limpio.
  child.on('close', (code) => {
    process.exitCode = code ?? 1;
  });
}
