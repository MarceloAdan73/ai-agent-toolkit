#!/usr/bin/env node

import { Command } from 'commander';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ora from 'ora';

import { collectFiles, readFile, writeDocFile, shouldSkipContent, createBackup, applyRefactor } from './src/fileProcessor.js';
import { createAIClient, generateRefactor, parseRefactorResults } from './src/refactorGenerator.js';
import { loadCache, saveCache, computeFileHash, isFileCached, updateCache } from './src/cache.js';
import { detectProvider, loadConfig, saveConfig, printDetectionResult } from './src/providerDetector.js';
import { loadConfigFile, mergeConfig } from './src/configLoader.js';
import { generateHtmlReport } from './src/htmlFormatter.js';
import { generatePdfReport } from './src/pdfFormatter.js';
import type { CLIOptions, RefactorSuggestion } from './src/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const program = new Command();

program
  .name(process.env.AI_TOOLKIT_CMD ?? 'agent-refactor')
  .description('AI-powered refactoring tool that suggests and applies code improvements')
  .version('1.0.0')
  .requiredOption('--path <path>', 'Path to file or directory to refactor')
  .option('--model <model>', 'AI model to use (auto-detected if not set)')
  .option('--provider <provider>', 'AI provider: gemini | openai | anthropic | deepseek | ollama')
  .option('--base-url <url>', 'Base URL for Ollama provider')
  .option('--api-key <key>', 'API key (optional for Ollama)')
  .option('--max-chars <n>', 'Maximum characters per file (default: 15000)', (val) => parseInt(val, 10))
  .option('--output <file>', 'Output file for refactor report (default: terminal)')
  .option('--format <format>', 'Output format: terminal | markdown | html | pdf', 'terminal')
  .option('--apply', 'Apply refactoring changes directly (creates backups)')
  .option('--dry-run', 'Preview what would be generated without writing files')
  .option('--extensions <extensions>', 'File extensions to process (comma-separated, e.g. .ts,.prisma)')
  .option('--verbose', 'Show detailed logs')
  .parse(process.argv);

const options = program.opts<CLIOptions>();
const rcConfig = loadConfigFile(process.cwd());

interface RefactorEntry {
  relativePath: string;
  filePath: string;
  suggestions: RefactorSuggestion[];
}

async function resolveProvider(): Promise<{ provider: string; model: string; apiKey?: string; baseUrl?: string }> {
  if (options.provider) {
    return {
      provider: options.provider,
      model: options.model ?? getDefaultModelForProvider(options.provider),
      apiKey: options.apiKey,
      baseUrl: options.baseUrl,
    };
  }

  if (rcConfig?.provider) {
    return {
      provider: rcConfig.provider,
      model: options.model ?? rcConfig.model ?? getDefaultModelForProvider(rcConfig.provider),
      baseUrl: options.baseUrl ?? rcConfig.baseUrl,
    };
  }

  const projectRoot = process.cwd();
  const savedConfig = loadConfig(projectRoot);
  if (savedConfig) {
    return {
      provider: savedConfig.provider,
      model: options.model ?? savedConfig.model,
      baseUrl: savedConfig.baseUrl,
    };
  }

  const detected = await detectProvider({ projectRoot });
  if (detected) {
    saveConfig(projectRoot, detected);
    return {
      provider: detected.provider,
      model: options.model ?? detected.model,
      baseUrl: detected.baseUrl,
    };
  }

  return { provider: 'gemini', model: options.model ?? 'gemini-2.5-flash' };
}

function getDefaultModelForProvider(provider: string): string {
  const defaults: Record<string, string> = {
    gemini: 'gemini-2.5-flash',
    openai: 'gpt-4o',
    anthropic: 'claude-sonnet-4-20250514',
    deepseek: 'deepseek-chat',
    ollama: 'llama3',
  };
  return defaults[provider] ?? 'gemini-2.5-flash';
}

function getApiKeyForProvider(provider: string): string | undefined {
  const envKeyMap: Record<string, string> = {
    gemini: 'GEMINI_API_KEY',
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    deepseek: 'DEEPSEEK_API_KEY',
  };
  const envKey = envKeyMap[provider];
  return envKey ? process.env[envKey] : undefined;
}

function printTerminalReport(entries: RefactorEntry[]): void {
  const totalSuggestions = entries.reduce((sum, e) => sum + e.suggestions.length, 0);

  console.log('\n=== Refactor Suggestions Report ===\n');
  console.log(`  Files analyzed: ${entries.length}`);
  console.log(`  Total suggestions: ${totalSuggestions}`);
  console.log('');

  for (const entry of entries) {
    if (entry.suggestions.length === 0) continue;
    console.log(`--- ${entry.relativePath} ---`);
    for (const s of entry.suggestions) {
      const lineInfo = s.line ? `:${s.line}` : '';
      console.log(`  [${s.category}]${lineInfo} ${s.description}`);
      console.log(`    BEFORE:`);
      s.before.split('\n').forEach(line => console.log(`      ${line}`));
      console.log(`    AFTER:`);
      s.after.split('\n').forEach(line => console.log(`      \x1b[32m${line}\x1b[0m`));
      console.log('');
    }
  }
}

function generateMarkdownReport(entries: RefactorEntry[]): string {
  const totalSuggestions = entries.reduce((sum, e) => sum + e.suggestions.length, 0);

  const lines: string[] = [
    '# Refactor Suggestions',
    '',
    `Generated: ${new Date().toLocaleDateString('en-US')}`,
    '',
    '## Summary',
    '',
    `- **Files analyzed:** ${entries.length}`,
    `- **Total suggestions:** ${totalSuggestions}`,
    '',
    '---',
    '',
  ];

  for (const entry of entries) {
    if (entry.suggestions.length === 0) continue;
    lines.push(`## ${entry.relativePath}`, '');
    for (const s of entry.suggestions) {
      const lineInfo = s.line ? `:${s.line}` : '';
      lines.push(`### [${s.category}]${lineInfo} ${s.description}`, '');
      lines.push('**Before:**', '');
      lines.push('```typescript');
      lines.push(s.before);
      lines.push('```', '');
      lines.push('**After:**', '');
      lines.push('```typescript');
      lines.push(s.after);
      lines.push('```', '');
    }
  }

  return lines.join('\n');
}

async function main(): Promise<void> {
  const verbose = mergeConfig(options.verbose, rcConfig?.verbose, false);
  const dryRun = mergeConfig(options.dryRun, rcConfig?.dryRun, false);
  const applyMode = mergeConfig(options.apply, rcConfig?.apply, false);
  const maxChars = mergeConfig(options.maxChars, rcConfig?.maxChars, 15000);

  console.log('=== Agent Refactor v1.0.0 ===\n');

  if (dryRun) {
    console.log('[DRY-RUN] Preview mode active - no files will be written\n');
  }

  if (applyMode) {
    console.log('[APPLY] Apply mode active - backups will be created and changes applied\n');
  }

  const scanSpinner = ora('Resolving provider...').start();

  const resolved = await resolveProvider();
  const apiKey = options.apiKey || getApiKeyForProvider(resolved.provider);

  scanSpinner.succeed(`Provider: ${resolved.provider} | Model: ${resolved.model}`);

  const ai = createAIClient({
    provider: resolved.provider,
    apiKey,
    baseUrl: resolved.baseUrl,
    model: resolved.model,
    verbose,
  });

  if (!ai) {
    printDetectionResult(null, verbose);
    process.exitCode = 1;
    return;
  }

  if (verbose) {
    console.log(`[INFO] Provider: ${resolved.provider}`);
    console.log(`[INFO] Model: ${resolved.model}`);
    console.log(`[INFO] Max chars: ${maxChars}`);
  }

  const extensions = options.extensions
    ? options.extensions.split(',').map((e: string) => e.trim())
    : rcConfig?.extensions;

  const filesSpinner = ora('Scanning files...').start();
  const files = collectFiles(options.path, verbose, extensions);

  if (files.length === 0) {
    filesSpinner.warn('No supported files found to process.');
    process.exitCode = 0;
    return;
  }

  filesSpinner.succeed(`Found ${files.length} file(s) to analyze.`);

  const projectRoot = process.cwd();
  const cache = loadCache(projectRoot);
  let cacheHits = 0;

  const refactorEntries: RefactorEntry[] = [];
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;
  let applied = 0;

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i]!;
    const relativePath = path.relative(projectRoot, filePath);
    const fileSpinner = ora({ text: `[${i + 1}/${files.length}] ${relativePath}`, spinner: 'dots' }).start();

    try {
      const fileData = readFile(filePath);
      if (!fileData || shouldSkipContent(fileData.content)) {
        fileSpinner.warn(`Skipped (empty or unprocessable file)`);
        skipped++;
        continue;
      }

      const currentHash = computeFileHash(filePath);
      if (isFileCached(filePath, cache, currentHash)) {
        const cachedEntry = cache[filePath];
        fileSpinner.info(`[${i + 1}/${files.length}] ${relativePath} -> Cache hit`);
        if (cachedEntry?.content) {
          const cachedResults = parseRefactorResults(cachedEntry.content);
          refactorEntries.push({ relativePath, filePath, suggestions: cachedResults });
          succeeded++;
          cacheHits++;
        }
        continue;
      }

      if (verbose) {
        fileSpinner.text = `[${i + 1}/${files.length}] ${relativePath} - Generating suggestions...`;
      }

      const suggestions = await generateRefactor(ai, filePath, fileData.content, verbose, resolved.model, maxChars);

      if (suggestions) {
        if (dryRun) {
          const preview = suggestions.slice(0, 3).map(s => `    ${s.category}: ${s.description}`).join('\n');
          fileSpinner.succeed(`[${i + 1}/${files.length}] ${relativePath} -> [DRY-RUN] ${suggestions.length} suggestions:\n${preview}`);
          succeeded++;
        } else if (applyMode && suggestions.length > 0) {
          const backupPath = createBackup(filePath);
          if (backupPath) {
            let anyApplied = false;
            for (const s of suggestions) {
              if (s.before && s.after && fileData.content.includes(s.before)) {
                const newContent = fileData.content.replace(s.before, s.after);
                if (applyRefactor(filePath, newContent)) {
                  fileData.content = newContent;
                  anyApplied = true;
                }
              }
            }
            if (anyApplied) {
              fileSpinner.succeed(`[${i + 1}/${files.length}] ${relativePath} -> ${suggestions.length} changes applied (backup: ${path.basename(backupPath)})`);
              applied++;
            } else {
              fileSpinner.info(`[${i + 1}/${files.length}] ${relativePath} -> ${suggestions.length} suggestions (no applicable changes)`);
            }
            succeeded++;
          } else {
            fileSpinner.fail(`[${i + 1}/${files.length}] ${relativePath} - Error creating backup`);
            failed++;
          }
        } else {
          fileSpinner.succeed(`[${i + 1}/${files.length}] ${relativePath} -> ${suggestions.length} suggestions`);
          refactorEntries.push({ relativePath, filePath, suggestions });
          updateCache(filePath, '', currentHash, cache, JSON.stringify(suggestions));
          succeeded++;
        }
      } else {
        fileSpinner.fail(`[${i + 1}/${files.length}] ${relativePath} - Could not generate suggestions`);
        failed++;
      }
    } catch (err) {
      const error = err as Error;
      fileSpinner.fail(`[${i + 1}/${files.length}] ${relativePath} - Unexpected error`);
      if (verbose) {
        console.error(`    ${error.message}`);
      }
      failed++;
    }
  }

  if (!dryRun && refactorEntries.length > 0) {
    if (options.output) {
      const writeSpinner = ora('Writing report...').start();
      const outputPath = path.resolve(options.output);
      const format = mergeConfig(options.format, rcConfig?.format as 'terminal' | 'markdown' | 'html' | 'pdf' | undefined, 'terminal');

      if (format === 'html') {
        const htmlOutput = outputPath.endsWith('.html') ? outputPath : outputPath + '.html';
        const html = generateHtmlReport(refactorEntries, 'Agent Refactor');
        fs.mkdirSync(path.dirname(htmlOutput), { recursive: true });
        fs.writeFileSync(htmlOutput, html, 'utf-8');
        writeSpinner.succeed(`HTML report saved: ${htmlOutput}`);
      } else if (format === 'pdf') {
        const pdfOutput = outputPath.endsWith('.pdf') ? outputPath : outputPath + '.pdf';
        fs.mkdirSync(path.dirname(pdfOutput), { recursive: true });
        await generatePdfReport(refactorEntries, pdfOutput, 'Agent Refactor');
        writeSpinner.succeed(`PDF report saved: ${pdfOutput}`);
      } else if (format === 'markdown') {
        const markdown = generateMarkdownReport(refactorEntries);
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, markdown, 'utf-8');
        writeSpinner.succeed(`Report saved: ${outputPath}`);
      } else {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, JSON.stringify(refactorEntries, null, 2), 'utf-8');
        writeSpinner.succeed(`Report saved: ${outputPath}`);
      }
    } else if (!applyMode) {
      printTerminalReport(refactorEntries);
    }
  }

  if (!dryRun) {
    saveCache(projectRoot, cache);
  }

  console.log('=== Summary ===');
  console.log(`  Total:    ${files.length}`);
  console.log(`  OK:       ${succeeded}`);
  console.log(`  Skip:     ${skipped}`);
  console.log(`  Error:    ${failed}`);
  if (applied > 0) {
    console.log(`  Applied:  ${applied}`);
  }
  if (cacheHits > 0) {
    console.log(`  Cache:    ${cacheHits}`);
  }
  console.log('');

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  const error = err as Error;
  console.error(`[FATAL] Unexpected error: ${error.message}`);
  exitGracefully(1);
});

// On Windows, process.exit() with pending stdout/stderr writes aborts with
// "Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)". We wait for the
// streams to drain before forcing the exit.
function exitGracefully(code: number): void {
  process.exitCode = code;
  process.stdout.write('', () => {
    process.stderr.write('', () => process.exit(code));
  });
}
