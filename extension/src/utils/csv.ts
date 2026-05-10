import type { VaultEntry } from '../types/index.js';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ParsedEntry {
  site: string;
  url: string;
  username: string;
  password: string;
  notes: string;
}

export type CsvSource = 'zerovault' | 'chrome' | 'firefox' | 'bitwarden' | 'lastpass' | '1password' | 'generic';

// ── Column maps ──────────────────────────────────────────────────────────────

interface ColumnMap {
  site: string;
  url: string;
  username: string;
  password: string;
  notes: string;
}

const COLUMN_MAPS: Record<CsvSource, ColumnMap> = {
  zerovault: { site: 'site',           url: 'url',           username: 'username',       password: 'password',       notes: 'notes'  },
  chrome:    { site: 'name',           url: 'url',           username: 'username',       password: 'password',       notes: ''       },
  firefox:   { site: 'name',           url: 'url',           username: 'username',       password: 'password',       notes: ''       },
  bitwarden: { site: 'name',           url: 'login_uri',     username: 'login_username', password: 'login_password', notes: 'notes'  },
  lastpass:  { site: 'name',           url: 'url',           username: 'username',       password: 'password',       notes: 'extra'  },
  '1password': { site: 'Title',        url: 'Url',           username: 'Username',       password: 'Password',       notes: 'Notes'  },
  generic:   { site: 'name',           url: 'url',           username: 'username',       password: 'password',       notes: 'notes'  },
};

// Signature headers unique to each source
const SOURCE_SIGNATURES: [CsvSource, string[]][] = [
  ['zerovault',  ['site', 'url', 'username', 'password']],
  ['bitwarden',  ['login_uri', 'login_username', 'login_password']],
  ['lastpass',   ['grouping', 'fav']],
  ['1password',  ['Title', 'Url', 'Username', 'Password']],
  ['chrome',     ['name', 'url', 'username', 'password']],
  ['firefox',    ['name', 'url', 'username', 'password']],
];

// ── CSV parsing ──────────────────────────────────────────────────────────────

// RFC 4180-compliant CSV parser that handles quoted fields with embedded commas/newlines.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let col = '';
  let row: string[] = [];
  let inQuotes = false;
  const n = text.length;

  for (let i = 0; i < n; i++) {
    const ch = text[i] as string;

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { col += '"'; i++; }   // escaped quote ""
        else inQuotes = false;
      } else {
        col += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(col); col = '';
      } else if (ch === '\n') {
        row.push(col); col = '';
        if (row.some(c => c !== '')) rows.push(row);   // skip blank lines
        row = [];
      } else if (ch === '\r') {
        // skip \r — handled by \n above
      } else {
        col += ch;
      }
    }
  }
  // last field/row
  row.push(col);
  if (row.some(c => c !== '')) rows.push(row);

  return rows;
}

// ── Source detection ─────────────────────────────────────────────────────────

export function detectSource(headers: string[]): CsvSource {
  const normalised = headers.map(h => h.trim());
  for (const [source, sig] of SOURCE_SIGNATURES) {
    if (sig.every(col => normalised.includes(col))) return source;
  }
  return 'generic';
}

// ── CSV → ParsedEntry[] ──────────────────────────────────────────────────────

export function csvToEntries(text: string): { entries: ParsedEntry[]; source: CsvSource } {
  const rows = parseCsv(text);
  if (rows.length < 2) return { entries: [], source: 'generic' };

  const headers = (rows[0] as string[]).map(h => h.trim());
  const source = detectSource(headers);
  const map = COLUMN_MAPS[source];

  const idx = (col: string) => (col ? headers.indexOf(col) : -1);
  const siteIdx     = idx(map.site);
  const urlIdx      = idx(map.url);
  const usernameIdx = idx(map.username);
  const passwordIdx = idx(map.password);
  const notesIdx    = idx(map.notes);

  const entries: ParsedEntry[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] as string[];
    const password = passwordIdx >= 0 ? (row[passwordIdx] ?? '').trim() : '';
    const username = usernameIdx >= 0 ? (row[usernameIdx] ?? '').trim() : '';
    // Skip rows without credentials
    if (!password && !username) continue;
    // Bitwarden: skip non-login types (card, identity, etc.)
    if (source === 'bitwarden') {
      const typeIdx = headers.indexOf('type');
      if (typeIdx >= 0 && (row[typeIdx] ?? '').toLowerCase() !== 'login') continue;
    }

    const rawUrl  = urlIdx  >= 0 ? (row[urlIdx]  ?? '').trim() : '';
    const rawSite = siteIdx >= 0 ? (row[siteIdx] ?? '').trim() : '';

    entries.push({
      site:     rawSite || deriveSite(rawUrl),
      url:      rawUrl,
      username,
      password,
      notes:    notesIdx >= 0 ? (row[notesIdx] ?? '').trim() : '',
    });
  }

  return { entries, source };
}

function deriveSite(url: string): string {
  try { return new URL(url).hostname; } catch { return url; }
}

// ── VaultEntry[] → CSV string ────────────────────────────────────────────────

const CSV_HEADERS = ['site', 'url', 'username', 'password', 'notes'];

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function entriesToCsv(entries: VaultEntry[]): string {
  const rows = [CSV_HEADERS.join(',')];
  for (const e of entries) {
    rows.push([
      escapeCsvField(e.site),
      escapeCsvField(e.url),
      escapeCsvField(e.username),
      escapeCsvField(e.password),
      escapeCsvField(e.notes ?? ''),
    ].join(','));
  }
  return rows.join('\r\n');
}

// ── VaultEntry[] → JSON string ───────────────────────────────────────────────

export interface ZeroVaultExport {
  version: 1;
  exported_at: string;
  entry_count: number;
  entries: VaultEntry[];
}

export function entriesToJson(entries: VaultEntry[]): string {
  const payload: ZeroVaultExport = {
    version: 1,
    exported_at: new Date().toISOString(),
    entry_count: entries.length,
    entries,
  };
  return JSON.stringify(payload, null, 2);
}

// ── JSON → ParsedEntry[] ─────────────────────────────────────────────────────

export function jsonToEntries(text: string): ParsedEntry[] {
  const raw = JSON.parse(text) as unknown;

  // Native ZeroVault format
  if (isZeroVaultExport(raw)) {
    return raw.entries.map(e => ({
      site:     e.site,
      url:      e.url,
      username: e.username,
      password: e.password,
      notes:    e.notes ?? '',
    }));
  }

  // Bitwarden JSON export
  if (isBitwardenExport(raw)) {
    return raw.items
      .filter(item => item.type === 1 && item.login)
      .map(item => ({
        site:     item.name,
        url:      item.login!.uris?.[0]?.uri ?? '',
        username: item.login!.username ?? '',
        password: item.login!.password ?? '',
        notes:    item.notes ?? '',
      }));
  }

  throw new Error('Unrecognised JSON format. Supported: ZeroVault export, Bitwarden JSON export.');
}

// ── Type guards ──────────────────────────────────────────────────────────────

function isZeroVaultExport(v: unknown): v is ZeroVaultExport {
  return (
    typeof v === 'object' && v !== null &&
    (v as Record<string, unknown>)['version'] === 1 &&
    Array.isArray((v as Record<string, unknown>)['entries'])
  );
}

interface BitwardenExport {
  items: {
    type: number;
    name: string;
    notes?: string;
    login?: { username?: string; password?: string; uris?: { uri: string }[] };
  }[];
}

function isBitwardenExport(v: unknown): v is BitwardenExport {
  return (
    typeof v === 'object' && v !== null &&
    Array.isArray((v as Record<string, unknown>)['items'])
  );
}
