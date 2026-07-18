import fs from 'fs';
import path from 'path';
import type { FileData } from './types.js';

const DEFAULT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.prisma']);

const IGNORED_DIRS = new Set([
  'node_modules', '.next', 'dist', 'build', '.git',
  '.cache', 'coverage', '.turbo', '__pycache__',
]);

export function collectFiles(targetPath: string, verbose: boolean = false, extensions?: string[]): string[] {
  const resolvedPath = path.resolve(targetPath);
  const stats = fs.statSync(resolvedPath);
  const validExts = extensions ? new Set(extensions.map(e => e.startsWith('.') ? e : `.${e}`)) : DEFAULT_EXTENSIONS;

  if (stats.isFile()) {
    if (!isValidExtension(resolvedPath, validExts)) {
      console.warn(`[WARN] Skipping unsupported file type: ${resolvedPath}`);
      return [];
    }
    if (verbose) console.log(`[INFO] Processing single file: ${resolvedPath}`);
    return [resolvedPath];
  }

  if (stats.isDirectory()) {
    if (verbose) console.log(`[INFO] Scanning directory: ${resolvedPath}`);
    return collectDirRecursive(resolvedPath, verbose, validExts);
  }

  console.error(`[ERROR] Path is neither file nor directory: ${resolvedPath}`);
  return [];
}

function collectDirRecursive(dirPath: string, verbose: boolean, validExts: Set<string>): string[] {
  const files: string[] = [];

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) {
          if (verbose) console.log(`[INFO] Skipping directory: ${entry.name}`);
          continue;
        }
        files.push(...collectDirRecursive(fullPath, verbose, validExts));
      } else if (entry.isFile() && isValidExtension(fullPath, validExts)) {
        files.push(fullPath);
      }
    }
  } catch (err) {
    const error = err as Error;
    console.error(`[ERROR] Cannot read directory ${dirPath}: ${error.message}`);
  }

  return files;
}

function isValidExtension(filePath: string, validExts: Set<string>): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return validExts.has(ext);
}

export function readFile(filePath: string): FileData | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(process.cwd(), filePath);
    return { filePath, relativePath, content };
  } catch (err) {
    const error = err as Error;
    console.error(`[ERROR] Cannot read file ${filePath}: ${error.message}`);
    return null;
  }
}

export function writeDocFile(
  originalFilePath: string,
  content: string,
  outputDir?: string
): string | null {
  try {
    const dir = outputDir || path.dirname(originalFilePath);
    const baseName = path.basename(originalFilePath, path.extname(originalFilePath));
    const docFileName = `${baseName}.docs.md`;
    const docFilePath = path.join(dir, docFileName);

    if (outputDir) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(docFilePath, content, 'utf-8');
    return docFilePath;
  } catch (err) {
    const error = err as Error;
    console.error(`[ERROR] Cannot write documentation file: ${error.message}`);
    return null;
  }
}

export function writeSingleDocFile(
  targetDir: string,
  entries: { relativePath: string; content: string }[]
): string | null {
  try {
    const docPath = path.join(targetDir, 'DOCS.md');
    const lines = ['# Documentación del Proyecto', '', `Generado: ${new Date().toLocaleDateString('es-AR')}`, '', '---', ''];

    for (const entry of entries) {
      lines.push(`## ${entry.relativePath}`, '');
      lines.push(entry.content);
      lines.push('');
      lines.push('---', '');
    }

    fs.writeFileSync(docPath, lines.join('\n'), 'utf-8');
    return docPath;
  } catch (err) {
    const error = err as Error;
    console.error(`[ERROR] Cannot write documentation file: ${error.message}`);
    return null;
  }
}

export function shouldSkipContent(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('// @ts-nocheck') && trimmed.length < 50) return true;
  return false;
}
