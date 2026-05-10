import { csvToEntries, jsonToEntries } from './csv.js';
import type { ParsedEntry, CsvSource } from './csv.js';
import type { VaultEntry } from '../types/index.js';

export type ImportFormat = 'csv' | 'json';

export interface ImportPreview {
  format: ImportFormat;
  source: CsvSource | 'json';
  total: number;
  /** Entries that would be skipped (site+username already in vault) */
  duplicates: number;
  /** Entries that will be added */
  toAdd: number;
  /** First 5 entries for UI preview */
  preview: ParsedEntry[];
}

export interface ImportResult {
  added: number;
  skipped: number;
}

// ── Format detection ─────────────────────────────────────────────────────────

export function detectFormat(filename: string, content: string): ImportFormat {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.json')) return 'json';
  if (lower.endsWith('.csv'))  return 'csv';
  // Fall back to content sniffing
  const trimmed = content.trimStart();
  return trimmed.startsWith('{') || trimmed.startsWith('[') ? 'json' : 'csv';
}

// ── Parse file content into ParsedEntry[] ────────────────────────────────────

export function parseFile(
  filename: string,
  content: string
): { entries: ParsedEntry[]; format: ImportFormat; source: CsvSource | 'json' } {
  const format = detectFormat(filename, content);
  if (format === 'json') {
    return { entries: jsonToEntries(content), format, source: 'json' };
  }
  const { entries, source } = csvToEntries(content);
  return { entries, format, source };
}

// ── Build preview (dedup check against existing entries) ─────────────────────

export function buildPreview(
  parsed: ParsedEntry[],
  existing: VaultEntry[],
  format: ImportFormat,
  source: CsvSource | 'json'
): ImportPreview {
  const existingKeys = new Set(existing.map(e => `${e.site}|${e.username}`));
  let duplicates = 0;
  for (const p of parsed) {
    if (existingKeys.has(`${p.site}|${p.username}`)) duplicates++;
  }
  return {
    format,
    source,
    total: parsed.length,
    duplicates,
    toAdd: parsed.length - duplicates,
    preview: parsed.slice(0, 5),
  };
}

// ── Convert ParsedEntry[] to vault-manager-ready shape ───────────────────────

export function toVaultShape(
  entries: ParsedEntry[]
): Omit<VaultEntry, 'id' | 'createdAt' | 'updatedAt'>[] {
  return entries.map(e => ({
    site:     e.site  || 'Unknown',
    url:      e.url,
    username: e.username,
    password: e.password,
    ...(e.notes ? { notes: e.notes } : {}),
  }));
}
