export interface FileData {
  filePath: string;
  relativePath: string;
  content: string;
}

export interface AuditResult {
  severity: 'critical' | 'warning' | 'info';
  category: string;
  line?: number;
  suggestion: string;
}

export interface CacheEntry {
  hash: string;
  securityPath: string;
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
  severity?: string;
  extensions?: string;
}
