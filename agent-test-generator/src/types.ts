export interface FileData {
  filePath: string;
  relativePath: string;
  content: string;
}

export interface TestResult {
  relativePath: string;
  filePath: string;
  testPath: string;
  summary: string;
}

export interface CacheEntry {
  hash: string;
  testPath: string;
  content?: string;
  timestamp: number;
}

export interface CacheStore {
  [filePath: string]: CacheEntry;
}

export interface CLIOptions {
  path: string;
  verbose: boolean;
  model: string;
  provider: string;
  baseUrl?: string;
  apiKey?: string;
  maxChars: number;
  output?: string;
  format: 'terminal' | 'markdown' | 'html' | 'pdf';
  dryRun: boolean;
  split: boolean;
  extensions?: string;
}

export interface TestFile {
  relativePath: string;
  content: string;
}
