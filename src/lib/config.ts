import fs from 'fs';
import path from 'path';

import { SettingsConfig } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');

const DEFAULT_CONFIG: SettingsConfig = {
  googlePlacesApiKey: '',
  openRouterApiKey: '',
  lastScrapeAt: null
};

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getConfigPath(): string {
  return CONFIG_PATH;
}

export function readConfig(): SettingsConfig {
  ensureDataDir();

  if (!fs.existsSync(CONFIG_PATH)) {
    return {
      ...DEFAULT_CONFIG,
      googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY ?? '',
      openRouterApiKey: process.env.OPENROUTER_API_KEY ?? ''
    };
  }

  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<SettingsConfig>;

    return {
      googlePlacesApiKey: parsed.googlePlacesApiKey ?? process.env.GOOGLE_PLACES_API_KEY ?? '',
      openRouterApiKey: parsed.openRouterApiKey ?? process.env.OPENROUTER_API_KEY ?? '',
      lastScrapeAt: parsed.lastScrapeAt ?? null
    };
  } catch {
    return {
      ...DEFAULT_CONFIG,
      googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY ?? '',
      openRouterApiKey: process.env.OPENROUTER_API_KEY ?? ''
    };
  }
}

export function writeConfig(config: SettingsConfig): SettingsConfig {
  ensureDataDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
  return config;
}

export function updateConfig(partial: Partial<SettingsConfig>): SettingsConfig {
  const current = readConfig();
  const next: SettingsConfig = {
    ...current,
    ...partial
  };
  return writeConfig(next);
}

export function updateLastScrapeAt(dateIsoString: string): SettingsConfig {
  return updateConfig({ lastScrapeAt: dateIsoString });
}
