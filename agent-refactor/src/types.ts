export interface FileData {
  filePath: string;
  relativePath: string;
  content: string;
}

export interface RefactorSuggestion {
  category: string;
  description: string;
  before: string;
  after: string;
  line?: number;
}

export interface CacheEntry {
  hash: string;
  refactorPath: string;
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
  apply: boolean;
  dryRun: boolean;
  extensions?: string;
}
