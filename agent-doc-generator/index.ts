#!/usr/bin/env node

import { Command } from 'commander';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ora from 'ora';

import { collectFiles, readFile, writeDocFile, writeSingleDocFile, shouldSkipContent } from './src/fileProcessor.js';
import { createAIClient, generateDocumentation, extractDocContent } from './src/docGenerator.js';
import { loadCache, saveCache, computeFileHash, isFileCached, updateCache } from './src/cache.js';
import { detectProvider, loadConfig, saveConfig, printDetectionResult } from './src/providerDetector.js';
import { loadConfigFile, mergeConfig } from './src/configLoader.js';
import { generateHtmlFromContent } from './src/htmlFormatter.js';
import { generatePdfFromContent } from './src/pdfFormatter.js';
import type { CLIOptions } from './src/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const program = new Command();

program
  .name(process.env.AI_TOOLKIT_CMD ?? 'agent-doc-generator')
  .description('AI-powered documentation generator')
  .version('2.1.0')
  .requiredOption('--path <path>', 'Path to file or directory to document')
  .option('--model <model>', 'AI model to use (auto-detected if not set)')
  .option('--provider <provider>', 'AI provider: gemini | openai | anthropic | deepseek | ollama')
  .option('--base-url <url>', 'Base URL for Ollama provider')
  .option('--api-key <key>', 'API key (optional for Ollama)')
  .option('--max-chars <n>', 'Maximum characters per file (default: 15000)', (val) => parseInt(val, 10))
  .option('--output <dir>', 'Output directory for documentation files')
  .option('--format <format>', 'Output format: markdown | html | pdf', 'markdown')
  .option('--split', 'Generate one .docs.md file per source file (default: single DOCS.md)')
  .option('--dry-run', 'Preview what would be generated without writing files')
  .option('--extensions <extensions>', 'File extensions to process (comma-separated, e.g. .ts,.prisma)')
  .option('--verbose', 'Show detailed logs')
  .parse(process.argv);

const options = program.opts<CLIOptions>();
const rcConfig = loadConfigFile(process.cwd());

interface DocEntry {
  relativePath: string;
  filePath: string;
  content: string;
  summary: string;
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

async function main(): Promise<void> {
  const verbose = mergeConfig(options.verbose, rcConfig?.verbose, false);
  const dryRun = mergeConfig(options.dryRun, rcConfig?.dryRun, false);
  const splitMode = mergeConfig(options.split, rcConfig?.split, false);
  const maxChars = mergeConfig(options.maxChars, rcConfig?.maxChars, 15000);

  console.log('=== Agent Doc Generator v2.1.0 ===\n');

  if (dryRun) {
    console.log('[DRY-RUN] Preview mode active - no files will be written\n');
  }

  const scanSpinner = ora('🔍 Resolviendo provider...').start();

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
    console.log(`[INFO] Mode: ${splitMode ? 'split (one file per source)' : 'single (one DOCS.md)'}`);
  }

  const extensions = options.extensions
    ? options.extensions.split(',').map((e: string) => e.trim())
    : rcConfig?.extensions;

  const filesSpinner = ora('🔍 Scanning files...').start();
  const files = collectFiles(options.path, verbose, extensions);

  if (files.length === 0) {
    filesSpinner.warn('No supported files found to process.');
    process.exitCode = 0;
    return;
  }

  filesSpinner.succeed(`Found ${files.length} file(s) to process.`);

  const projectRoot = process.cwd();
  const cache = loadCache(projectRoot);
  let cacheHits = 0;

  const docEntries: DocEntry[] = [];
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

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
        fileSpinner.info(`[${i + 1}/${files.length}] ${relativePath} → Cache hit`);
        if (splitMode) {
          if (cachedEntry?.docPath) {
            succeeded++;
            cacheHits++;
          }
        } else if (cachedEntry?.content) {
          docEntries.push({
            relativePath,
            filePath,
            content: cachedEntry.content,
            summary: cachedEntry.content.split('\n').slice(0, 3).join(' ').replace(/\/\*[\s\S]*?\*\//, '').trim().slice(0, 200),
          });
          succeeded++;
          cacheHits++;
        }
        continue;
      }

      if (verbose) {
        fileSpinner.text = `[${i + 1}/${files.length}] ${relativePath} - Generating documentation...`;
      }

      const docRaw = await generateDocumentation(ai, filePath, fileData.content, verbose, resolved.model, maxChars);

      if (docRaw) {
        const docContent = extractDocContent(docRaw);

        if (dryRun) {
          const preview = docContent.split('\n').slice(0, 5).join('\n');
          fileSpinner.succeed(`[${i + 1}/${files.length}] ${relativePath} → [DRY-RUN] Preview:\n    ${preview.replace(/\n/g, '\n    ')}`);
          succeeded++;
        } else {
          if (splitMode) {
            const outputDir = mergeConfig(options.output ? path.resolve(options.output) : undefined, rcConfig?.output, undefined);
            const docFilePath = writeDocFile(filePath, docContent, outputDir);
            if (docFilePath) {
              const docRelative = path.relative(projectRoot, docFilePath);
              fileSpinner.succeed(`[${i + 1}/${files.length}] ${relativePath} → ${docRelative}`);
              updateCache(filePath, docFilePath, currentHash, cache);
              succeeded++;
            } else {
              fileSpinner.fail(`[${i + 1}/${files.length}] ${relativePath} - Error writing doc`);
              failed++;
            }
          } else {
            fileSpinner.succeed(`[${i + 1}/${files.length}] ${relativePath} → [DOC]`);
            docEntries.push({
              relativePath,
              filePath,
              content: docContent,
              summary: docContent.split('\n').slice(0, 3).join(' ').replace(/\/\*[\s\S]*?\*\//, '').trim().slice(0, 200),
            });
            updateCache(filePath, '', currentHash, cache, docContent);
            succeeded++;
          }
        }
      } else {
        fileSpinner.fail(`[${i + 1}/${files.length}] ${relativePath} - Could not generate documentation`);
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

  if (!dryRun && !splitMode && docEntries.length > 0) {
    const format = mergeConfig(options.format, rcConfig?.format as 'markdown' | 'html' | 'pdf' | undefined, 'markdown');
    const targetDir = resolveTargetDir(options.path, options.output);

    if (format === 'html') {
      const writeSpinner = ora('📄 Writing DOCS.html...').start();
      const htmlPath = path.join(targetDir, 'DOCS.html');
      const content = buildSingleDocContent(docEntries);
      const html = generateHtmlFromContent(content, 'Project Documentation', 'Agent Doc Generator');
      fs.writeFileSync(htmlPath, html, 'utf-8');
      writeSpinner.succeed(`HTML documentation generated: ${path.relative(projectRoot, htmlPath)}`);
    } else if (format === 'pdf') {
      const writeSpinner = ora('📄 Writing DOCS.pdf...').start();
      const pdfPath = path.join(targetDir, 'DOCS.pdf');
      const content = buildSingleDocContent(docEntries);
      await generatePdfFromContent(content, pdfPath, 'Project Documentation', 'Agent Doc Generator');
      writeSpinner.succeed(`PDF documentation generated: ${path.relative(projectRoot, pdfPath)}`);
    } else {
      const writeSpinner = ora('📄 Writing DOCS.md...').start();
      const docPath = writeSingleDocFile(targetDir, docEntries);
      if (docPath) {
        const docRelative = path.relative(projectRoot, docPath);
        writeSpinner.succeed(`Documentation generated: ${docRelative}`);
      } else {
        writeSpinner.fail('Error al escribir DOCS.md');
      }
    }
  }

  if (!dryRun) {
    saveCache(projectRoot, cache);
  }

  console.log('\n=== Summary ===');
  console.log(`  Total:    ${files.length}`);
  console.log(`  ✅ OK:    ${succeeded}`);
  console.log(`  ⚠️  Skip:   ${skipped}`);
  console.log(`  ❌ Error:  ${failed}`);
  if (cacheHits > 0) {
    console.log(`  💾 Cache:  ${cacheHits}`);
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

function resolveTargetDir(targetPath: string, output?: string): string {
  const resolvedOutput = output ?? rcConfig?.output;
  if (resolvedOutput) return path.resolve(resolvedOutput);
  const resolved = path.resolve(targetPath);
  try {
    return fs.statSync(resolved).isDirectory() ? resolved : path.dirname(resolved);
  } catch {
    return resolved;
  }
}

function buildSingleDocContent(entries: { relativePath: string; content: string }[]): string {
  const lines = ['# Project Documentation', '', `Generated: ${new Date().toLocaleDateString('en-US')}`, '', '---', ''];
  for (const entry of entries) {
    lines.push(`## ${entry.relativePath}`, '');
    lines.push(entry.content);
    lines.push('');
    lines.push('---', '');
  }
  return lines.join('\n');
}
