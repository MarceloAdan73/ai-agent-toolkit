import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { CacheStore } from './types.js';

const CACHE_FILE = '.review-cache.json';

function getCachePath(projectRoot: string): string {
  return path.join(projectRoot, CACHE_FILE);
}

export function loadCache(projectRoot: string): CacheStore {
  const cachePath = getCachePath(projectRoot);
  try {
    if (fs.existsSync(cachePath)) {
      const data = fs.readFileSync(cachePath, 'utf-8');
      return JSON.parse(data) as CacheStore;
    }
  } catch {
    // Corrupted cache, start fresh
  }
  return {};
}

export function saveCache(projectRoot: string, cache: CacheStore): void {
  const cachePath = getCachePath(projectRoot);
  try {
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (err) {
    const error = err as Error;
    console.warn(`[WARN] Could not save cache: ${error.message}`);
  }
}

export function computeFileHash(filePath: string): string {
  const content = fs.readFileSync(filePath, 'utf-8');
  return crypto.createHash('md5').update(content).digest('hex');
}

export function isFileCached(
  filePath: string,
  cache: CacheStore,
  currentHash: string
): boolean {
  const entry = cache[filePath];
  if (!entry) return false;
  return entry.hash === currentHash;
}

export function updateCache(
  filePath: string,
  reviewPath: string,
  hash: string,
  cache: CacheStore,
  content?: string
): CacheStore {
  cache[filePath] = {
    hash,
    reviewPath,
    content,
    timestamp: Date.now(),
  };
  return cache;
}
