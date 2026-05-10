import { describe, it, expect } from 'vitest';
import { detectFormat, parseFile, buildPreview, toVaultShape } from '../../src/utils/importer.js';
import { entriesToJson } from '../../src/utils/csv.js';
import type { VaultEntry } from '../../src/types/index.js';

// ── detectFormat ─────────────────────────────────────────────────────────────

describe('detectFormat', () => {
  it('detects CSV by .csv extension', () => {
    expect(detectFormat('export.csv', '')).toBe('csv');
  });

  it('detects JSON by .json extension', () => {
    expect(detectFormat('export.json', '')).toBe('json');
  });

  it('falls back to content sniffing for unknown extension', () => {
    expect(detectFormat('file.txt', '{"version":1}')).toBe('json');
    expect(detectFormat('file.txt', 'name,url,username')).toBe('csv');
  });

  it('case-insensitive extension detection', () => {
    expect(detectFormat('EXPORT.CSV', '')).toBe('csv');
    expect(detectFormat('export.JSON', '')).toBe('json');
  });
});

// ── parseFile ─────────────────────────────────────────────────────────────────

describe('parseFile', () => {
  it('parses a Chrome CSV file', () => {
    const content = 'name,url,username,password\nGitHub,https://github.com,user,pass';
    const result = parseFile('chrome.csv', content);
    expect(result.format).toBe('csv');
    expect(result.source).toBe('chrome');
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.password).toBe('pass');
  });

  it('parses a ZeroVault JSON file', () => {
    const entries: VaultEntry[] = [
      { id: '1', site: 'Test', url: 'https://test.com', username: 'u', password: 'p', createdAt: 0, updatedAt: 0 },
    ];
    const content = entriesToJson(entries);
    const result = parseFile('export.json', content);
    expect(result.format).toBe('json');
    expect(result.source).toBe('json');
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.password).toBe('p');
  });

  it('throws on invalid JSON', () => {
    expect(() => parseFile('bad.json', '{ not valid json')).toThrow();
  });

  it('returns empty entries for header-only CSV', () => {
    const result = parseFile('empty.csv', 'name,url,username,password');
    expect(result.entries).toHaveLength(0);
  });
});

// ── buildPreview ──────────────────────────────────────────────────────────────

describe('buildPreview', () => {
  const existing: VaultEntry[] = [
    { id: '1', site: 'GitHub', url: 'https://github.com', username: 'dev', password: 'x', createdAt: 0, updatedAt: 0 },
  ];

  const incoming = [
    { site: 'GitHub',  url: 'https://github.com', username: 'dev',     password: 'newpass', notes: '' },  // duplicate
    { site: 'GitLab',  url: 'https://gitlab.com', username: 'dev',     password: 'glpass',  notes: '' },  // new
    { site: 'Notion',  url: 'https://notion.so',  username: 'me@x.com', password: 'npass',  notes: '' },  // new
  ];

  it('counts duplicates correctly', () => {
    const preview = buildPreview(incoming, existing, 'csv', 'chrome');
    expect(preview.total).toBe(3);
    expect(preview.duplicates).toBe(1);
    expect(preview.toAdd).toBe(2);
  });

  it('limits preview array to 5 entries', () => {
    const manyEntries = Array.from({ length: 10 }, (_, i) => ({
      site: `Site${i}`, url: `https://site${i}.com`, username: `u${i}`, password: `p${i}`, notes: '',
    }));
    const preview = buildPreview(manyEntries, [], 'csv', 'generic');
    expect(preview.preview).toHaveLength(5);
  });

  it('reports zero duplicates when vault is empty', () => {
    const preview = buildPreview(incoming, [], 'csv', 'chrome');
    expect(preview.duplicates).toBe(0);
    expect(preview.toAdd).toBe(3);
  });

  it('carries format and source through', () => {
    const preview = buildPreview(incoming, existing, 'json', 'json');
    expect(preview.format).toBe('json');
    expect(preview.source).toBe('json');
  });
});

// ── toVaultShape ──────────────────────────────────────────────────────────────

describe('toVaultShape', () => {
  it('maps ParsedEntry to vault-manager-ready shape', () => {
    const parsed = [{ site: 'GitHub', url: 'https://github.com', username: 'user', password: 'pass', notes: '' }];
    const shaped = toVaultShape(parsed);
    expect(shaped[0]).toMatchObject({ site: 'GitHub', url: 'https://github.com', username: 'user', password: 'pass' });
    expect('id' in (shaped[0] as object)).toBe(false);
    expect('createdAt' in (shaped[0] as object)).toBe(false);
  });

  it('omits notes key when notes is empty string', () => {
    const shaped = toVaultShape([{ site: 'S', url: '', username: 'u', password: 'p', notes: '' }]);
    expect('notes' in (shaped[0] as object)).toBe(false);
  });

  it('includes notes key when notes has content', () => {
    const shaped = toVaultShape([{ site: 'S', url: '', username: 'u', password: 'p', notes: 'my note' }]);
    expect((shaped[0] as { notes?: string }).notes).toBe('my note');
  });

  it('fills "Unknown" for empty site', () => {
    const shaped = toVaultShape([{ site: '', url: '', username: 'u', password: 'p', notes: '' }]);
    expect(shaped[0]?.site).toBe('Unknown');
  });

  it('handles empty input array', () => {
    expect(toVaultShape([])).toEqual([]);
  });
});
