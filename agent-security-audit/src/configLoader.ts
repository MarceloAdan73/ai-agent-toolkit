import fs from 'fs';
import path from 'path';

export interface RCConfig {
  provider?: string;
  model?: string;
  baseUrl?: string;
  maxChars?: number;
  extensions?: string[];
  format?: string;
  severity?: string;
  output?: string;
  dryRun?: boolean;
  verbose?: boolean;
}

const CONFIG_FILE = '.aiconfig.json';

export function loadConfigFile(projectRoot: string): RCConfig | null {
  const configPath = path.join(projectRoot, CONFIG_FILE);
  try {
    if (!fs.existsSync(configPath)) return null;
    const raw = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(raw) as RCConfig;
    if (typeof config !== 'object' || config === null) return null;
    return config;
  } catch {
    return null;
  }
}

export function mergeConfig<T>(cliValue: T | undefined, configValue: T | undefined, defaultValue: T): T {
  if (cliValue !== undefined) return cliValue;
  if (configValue !== undefined) return configValue;
  return defaultValue;
}
