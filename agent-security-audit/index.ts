#!/usr/bin/env node

import { Command } from 'commander';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ora from 'ora';

import { collectFiles, readFile, shouldSkipContent } from './src/fileProcessor.js';
import { createAIClient, generateAudit, parseAuditResults } from './src/securityGenerator.js';
import { loadCache, saveCache, computeFileHash, isFileCached, updateCache } from './src/cache.js';
import { detectProvider, loadConfig, saveConfig, printDetectionResult } from './src/providerDetector.js';
import { loadConfigFile, mergeConfig } from './src/configLoader.js';
import { generateHtmlReport } from './src/htmlFormatter.js';
import { generatePdfReport } from './src/pdfFormatter.js';
import type { CLIOptions, AuditResult } from './src/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const program = new Command();

program
  .name('agent-security-audit')
  .description('AI-powered security audit tool (OWASP Top 10)')
  .version('1.0.0')
  .requiredOption('--path <path>', 'Path to file or directory to audit')
  .option('--model <model>', 'AI model to use (auto-detected if not set)')
  .option('--provider <provider>', 'AI provider: gemini | openai | anthropic | deepseek | ollama')
  .option('--base-url <url>', 'Base URL for Ollama provider')
  .option('--api-key <key>', 'API key (optional for Ollama)')
  .option('--max-chars <n>', 'Maximum characters per file (default: 15000)', (val) => parseInt(val, 10))
  .option('--output <file>', 'Output file for audit report (default: terminal)')
  .option('--format <format>', 'Output format: terminal | markdown | html | pdf', 'terminal')
  .option('--severity <level>', 'Minimum severity level to show: critical | warning | info', 'info')
  .option('--extensions <extensions>', 'File extensions to process (comma-separated, e.g. .ts,.prisma)')
  .option('--dry-run', 'Preview what would be generated without writing files')
  .option('--verbose', 'Show detailed logs')
  .parse(process.argv);

const options = program.opts<CLIOptions>();
const rcConfig = loadConfigFile(process.cwd());

interface AuditEntry {
  relativePath: string;
  filePath: string;
  results: AuditResult[];
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

function filterBySeverity(results: AuditResult[], minSeverity: string): AuditResult[] {
  const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  const minLevel = severityOrder[minSeverity] ?? 2;
  return results.filter(r => (severityOrder[r.severity] ?? 2) <= minLevel);
}

function printTerminalReport(entries: AuditEntry[]): void {
  const allResults = entries.flatMap(e => e.results);
  const critical = allResults.filter(r => r.severity === 'critical');
  const warnings = allResults.filter(r => r.severity === 'warning');
  const info = allResults.filter(r => r.severity === 'info');

  console.log('\n=== Security Audit Report ===\n');
  console.log(`  Files audited: ${entries.length}`);
  console.log(`  🔴 Critical: ${critical.length}`);
  console.log(`  🟡 Warning: ${warnings.length}`);
  console.log(`  🟢 Info: ${info.length}`);
  console.log('');

  for (const entry of entries) {
    if (entry.results.length === 0) continue;
    console.log(`--- ${entry.relativePath} ---`);
    for (const result of entry.results) {
      const severityIcon = result.severity === 'critical' ? '🔴' : result.severity === 'warning' ? '🟡' : '🟢';
      const lineInfo = result.line ? `:${result.line}` : '';
      console.log(`  ${severityIcon} [${result.category}]${lineInfo} ${result.suggestion}`);
    }
    console.log('');
  }
}

function generateMarkdownReport(entries: AuditEntry[]): string {
  const allResults = entries.flatMap(e => e.results);
  const critical = allResults.filter(r => r.severity === 'critical');
  const warnings = allResults.filter(r => r.severity === 'warning');
  const info = allResults.filter(r => r.severity === 'info');

  const lines: string[] = [
    '# Security Audit Report',
    '',
    `Generated: ${new Date().toLocaleDateString('es-AR')}`,
    '',
    '## Summary',
    '',
    `- **Files audited:** ${entries.length}`,
    `- **🔴 Critical:** ${critical.length}`,
    `- **🟡 Warning:** ${warnings.length}`,
    `- **🟢 Info:** ${info.length}`,
    '',
    '---',
    '',
  ];

  for (const entry of entries) {
    if (entry.results.length === 0) continue;
    lines.push(`## ${entry.relativePath}`, '');
    for (const result of entry.results) {
      const severityIcon = result.severity === 'critical' ? '🔴' : result.severity === 'warning' ? '🟡' : '🟢';
      const lineInfo = result.line ? `:${result.line}` : '';
      lines.push(`- ${severityIcon} **[${result.category}]**${lineInfo} ${result.suggestion}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

async function main(): Promise<void> {
  const verbose = mergeConfig(options.verbose, rcConfig?.verbose, false);
  const dryRun = mergeConfig(options.dryRun, rcConfig?.dryRun, false);
  const maxChars = mergeConfig(options.maxChars, rcConfig?.maxChars, 15000);

  console.log('=== Agent Security Audit v1.0.0 ===\n');

  if (dryRun) {
    console.log('[DRY-RUN] Modo preview activo - no se escribirán archivos\n');
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
    process.exit(1);
  }

  if (verbose) {
    console.log(`[INFO] Provider: ${resolved.provider}`);
    console.log(`[INFO] Modelo: ${resolved.model}`);
    console.log(`[INFO] Max chars: ${maxChars}`);
    console.log(`[INFO] Min severity: ${options.severity}`);
  }

  const extensions = options.extensions
    ? options.extensions.split(',').map((e: string) => e.trim())
    : rcConfig?.extensions;

  const filesSpinner = ora('🔍 Escaneando archivos...').start();
  const files = collectFiles(options.path, verbose, extensions);

  if (files.length === 0) {
    filesSpinner.warn('No se encontraron archivos soportados para procesar.');
    process.exit(0);
  }

  filesSpinner.succeed(`Encontrados ${files.length} archivo(s) para auditar.`);

  const projectRoot = process.cwd();
  const cache = loadCache(projectRoot);
  let cacheHits = 0;

  const auditEntries: AuditEntry[] = [];
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
        fileSpinner.warn(`Saltado (archivo vacío o no procesable)`);
        skipped++;
        continue;
      }

      const currentHash = computeFileHash(filePath);
      if (isFileCached(filePath, cache, currentHash)) {
        const cachedEntry = cache[filePath];
        fileSpinner.info(`[${i + 1}/${files.length}] ${relativePath} → Cache hit`);
        if (cachedEntry?.content) {
          const cachedResults = parseAuditResults(cachedEntry.content);
          const filtered = filterBySeverity(cachedResults, options.severity!);
          auditEntries.push({ relativePath, filePath, results: filtered });
          succeeded++;
          cacheHits++;
        }
        continue;
      }

      if (verbose) {
        fileSpinner.text = `[${i + 1}/${files.length}] ${relativePath} - Generando auditoría...`;
      }

      const auditResults = await generateAudit(ai, filePath, fileData.content, verbose, resolved.model, maxChars);

      if (auditResults) {
        const filtered = filterBySeverity(auditResults, options.severity!);
        if (dryRun) {
          const preview = filtered.slice(0, 3).map(r => `    ${r.severity}: ${r.suggestion}`).join('\n');
          fileSpinner.succeed(`[${i + 1}/${files.length}] ${relativePath} → [DRY-RUN] ${filtered.length} findings:\n${preview}`);
          succeeded++;
        } else {
          const severityIcon = filtered.some(r => r.severity === 'critical') ? '🔴' :
                              filtered.some(r => r.severity === 'warning') ? '🟡' : '🟢';
          fileSpinner.succeed(`[${i + 1}/${files.length}] ${relativePath} → ${severityIcon} ${filtered.length} findings`);
          auditEntries.push({ relativePath, filePath, results: filtered });
          updateCache(filePath, '', currentHash, cache, JSON.stringify(auditResults));
          succeeded++;
        }
      } else {
        fileSpinner.fail(`[${i + 1}/${files.length}] ${relativePath} - No se pudo generar auditoría`);
        failed++;
      }
    } catch (err) {
      const error = err as Error;
      fileSpinner.fail(`[${i + 1}/${files.length}] ${relativePath} - Error inesperado`);
      if (verbose) {
        console.error(`    ${error.message}`);
      }
      failed++;
    }
  }

  if (!dryRun && auditEntries.length > 0) {
    if (options.output) {
      const writeSpinner = ora('📄 Escribiendo reporte...').start();
      const outputPath = path.resolve(options.output);

      const format = mergeConfig(options.format, rcConfig?.format as 'terminal' | 'markdown' | 'html' | 'pdf' | undefined, 'terminal');
      if (format === 'markdown') {
        const markdown = generateMarkdownReport(auditEntries);
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, markdown, 'utf-8');
        writeSpinner.succeed(`Reporte guardado: ${outputPath}`);
      } else if (format === 'html') {
        const htmlOutput = outputPath.endsWith('.html') ? outputPath : outputPath + '.html';
        const html = generateHtmlReport(auditEntries, 'Agent Security Audit');
        fs.mkdirSync(path.dirname(htmlOutput), { recursive: true });
        fs.writeFileSync(htmlOutput, html, 'utf-8');
        writeSpinner.succeed(`Reporte HTML guardado: ${htmlOutput}`);
      } else if (format === 'pdf') {
        const pdfOutput = outputPath.endsWith('.pdf') ? outputPath : outputPath + '.pdf';
        fs.mkdirSync(path.dirname(pdfOutput), { recursive: true });
        await generatePdfReport(auditEntries, pdfOutput, 'Agent Security Audit');
        writeSpinner.succeed(`Reporte PDF guardado: ${pdfOutput}`);
      } else {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, JSON.stringify(auditEntries, null, 2), 'utf-8');
        writeSpinner.succeed(`Reporte guardado: ${outputPath}`);
      }
    } else {
      printTerminalReport(auditEntries);
    }
  }

  if (!dryRun) {
    saveCache(projectRoot, cache);
  }

  console.log('=== Resumen ===');
  console.log(`  Total:    ${files.length}`);
  console.log(`  ✅ OK:    ${succeeded}`);
  console.log(`  ⚠️  Skip:   ${skipped}`);
  console.log(`  ❌ Error:  ${failed}`);
  if (cacheHits > 0) {
    console.log(`  💾 Cache:  ${cacheHits}`);
  }
  console.log('');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  const error = err as Error;
  console.error(`[FATAL] Error inesperado: ${error.message}`);
  process.exit(1);
});

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
