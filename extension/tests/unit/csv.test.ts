import { describe, it, expect } from 'vitest';
import {
  parseCsv,
  detectSource,
  csvToEntries,
  entriesToCsv,
  entriesToJson,
  jsonToEntries,
} from '../../src/utils/csv.js';
import type { VaultEntry } from '../../src/types/index.js';

// ── parseCsv ─────────────────────────────────────────────────────────────────

describe('parseCsv', () => {
  it('parses a simple CSV', () => {
    const rows = parseCsv('a,b,c\n1,2,3');
    expect(rows).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
  });

  it('handles quoted fields containing commas', () => {
    const rows = parseCsv('name,url\n"Smith, John",https://example.com');
    expect(rows[1]?.[0]).toBe('Smith, John');
  });

  it('handles escaped double-quotes inside quoted fields', () => {
    const rows = parseCsv('notes\n"say ""hello"""');
    expect(rows[1]?.[0]).toBe('say "hello"');
  });

  it('handles Windows CRLF line endings', () => {
    const rows = parseCsv('a,b\r\n1,2\r\n3,4');
    expect(rows).toHaveLength(3);
    expect(rows[1]).toEqual(['1', '2']);
  });

  it('skips blank lines', () => {
    const rows = parseCsv('a,b\n\n1,2');
    expect(rows).toHaveLength(2);
  });

  it('handles quoted fields containing newlines', () => {
    const rows = parseCsv('notes\n"line1\nline2"');
    expect(rows[1]?.[0]).toBe('line1\nline2');
  });

  it('returns empty array for empty string', () => {
    expect(parseCsv('')).toHaveLength(0);
  });
});

// ── detectSource ──────────────────────────────────────────────────────────────

describe('detectSource', () => {
  it('detects ZeroVault export', () => {
    expect(detectSource(['site', 'url', 'username', 'password', 'notes'])).toBe('zerovault');
  });

  it('detects Chrome/Firefox export', () => {
    expect(detectSource(['name', 'url', 'username', 'password'])).toBe('chrome');
  });

  it('detects Bitwarden export', () => {
    expect(detectSource(['name', 'login_uri', 'login_username', 'login_password', 'notes'])).toBe('bitwarden');
  });

  it('detects LastPass export', () => {
    expect(detectSource(['url', 'username', 'password', 'name', 'grouping', 'fav'])).toBe('lastpass');
  });

  it('detects 1Password export', () => {
    expect(detectSource(['Title', 'Url', 'Username', 'Password', 'Notes'])).toBe('1password');
  });

  it('falls back to generic for unknown headers', () => {
    expect(detectSource(['col1', 'col2', 'col3'])).toBe('generic');
  });
});

// ── csvToEntries ──────────────────────────────────────────────────────────────

describe('csvToEntries — ZeroVault CSV', () => {
  const zerovaultCsv = [
    'site,url,username,password,notes',
    'GitHub,https://github.com,dev@example.com,gh-secret,work account',
  ].join('\n');

  it('parses all fields correctly', () => {
    const { entries } = csvToEntries(zerovaultCsv);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      site: 'GitHub',
      url: 'https://github.com',
      username: 'dev@example.com',
      password: 'gh-secret',
      notes: 'work account',
    });
  });

  it('identifies source as zerovault', () => {
    const { source } = csvToEntries(zerovaultCsv);
    expect(source).toBe('zerovault');
  });
});

describe('csvToEntries — Chrome CSV', () => {
  const chromeCsv = [
    'name,url,username,password',
    'GitHub,https://github.com,user@test.com,mypassword',
    'Gmail,https://mail.google.com,gmail@test.com,gmailpass',
  ].join('\n');

  it('parses Chrome export with two entries', () => {
    const { entries, source } = csvToEntries(chromeCsv);
    expect(source).toBe('chrome');
    expect(entries).toHaveLength(2);
    expect(entries[0]?.password).toBe('mypassword');
    expect(entries[1]?.site).toBe('Gmail');
  });

  it('empty notes field is empty string', () => {
    const { entries } = csvToEntries(chromeCsv);
    expect(entries[0]?.notes).toBe('');
  });
});

describe('csvToEntries — Bitwarden CSV', () => {
  const bitwardenCsv = [
    'name,login_uri,login_username,login_password,notes,type',
    'GitHub,https://github.com,bw@test.com,bwpass,my note,login',
    'Credit Card,,,,,card',   // should be skipped (type != login)
  ].join('\n');

  it('parses login entries', () => {
    const { entries, source } = csvToEntries(bitwardenCsv);
    expect(source).toBe('bitwarden');
    expect(entries).toHaveLength(1);
    expect(entries[0]?.username).toBe('bw@test.com');
    expect(entries[0]?.notes).toBe('my note');
  });

  it('skips non-login type rows', () => {
    const { entries } = csvToEntries(bitwardenCsv);
    expect(entries.every(e => e.password !== '')).toBe(true);
  });
});

describe('csvToEntries — LastPass CSV', () => {
  const lastpassCsv = [
    'url,username,password,totp,extra,name,grouping,fav',
    'https://lp.com,lpuser,lppass,,some note,LP Site,Personal,0',
  ].join('\n');

  it('parses LastPass export', () => {
    const { entries, source } = csvToEntries(lastpassCsv);
    expect(source).toBe('lastpass');
    expect(entries).toHaveLength(1);
    expect(entries[0]?.username).toBe('lpuser');
    expect(entries[0]?.notes).toBe('some note');
  });
});

describe('csvToEntries — 1Password CSV', () => {
  const opCsv = [
    'Title,Url,Username,Password,Notes,OTPAuth',
    'My Site,https://op.com,opuser,oppass,op note,',
  ].join('\n');

  it('parses 1Password export', () => {
    const { entries, source } = csvToEntries(opCsv);
    expect(source).toBe('1password');
    expect(entries).toHaveLength(1);
    expect(entries[0]?.site).toBe('My Site');
    expect(entries[0]?.password).toBe('oppass');
  });
});

describe('csvToEntries — edge cases', () => {
  it('returns empty for header-only CSV', () => {
    const { entries } = csvToEntries('name,url,username,password');
    expect(entries).toHaveLength(0);
  });

  it('skips rows without username AND password', () => {
    const csv = 'name,url,username,password\nEmpty,,, ';
    const { entries } = csvToEntries(csv);
    expect(entries).toHaveLength(0);
  });

  it('derives site from URL when site column is empty', () => {
    const csv = 'name,url,username,password\n,https://derived.com,user,pass';
    const { entries } = csvToEntries(csv);
    expect(entries[0]?.site).toBe('derived.com');
  });

  it('handles passwords with special characters', () => {
    const csv = 'name,url,username,password\nSite,https://s.com,user,"p@ss!#$%^&*()"';
    const { entries } = csvToEntries(csv);
    expect(entries[0]?.password).toBe('p@ss!#$%^&*()');
  });
});

// ── entriesToCsv ──────────────────────────────────────────────────────────────

describe('entriesToCsv', () => {
  const sampleEntries: VaultEntry[] = [
    { id: '1', site: 'GitHub', url: 'https://github.com', username: 'dev', password: 'secret', createdAt: 0, updatedAt: 0 },
    { id: '2', site: 'Gmail', url: 'https://gmail.com', username: 'me@gmail.com', password: 'pass,with,commas', notes: 'personal', createdAt: 0, updatedAt: 0 },
  ];

  it('includes the correct headers', () => {
    const csv = entriesToCsv(sampleEntries);
    expect(csv.split('\r\n')[0]).toBe('site,url,username,password,notes');
  });

  it('produces one row per entry', () => {
    const csv = entriesToCsv(sampleEntries);
    const rows = csv.split('\r\n');
    expect(rows).toHaveLength(3); // header + 2 entries
  });

  it('quotes fields that contain commas', () => {
    const csv = entriesToCsv(sampleEntries);
    expect(csv).toContain('"pass,with,commas"');
  });

  it('round-trips through csvToEntries', () => {
    const csv = entriesToCsv(sampleEntries);
    const { entries } = csvToEntries(csv);
    expect(entries).toHaveLength(2);
    expect(entries[0]?.password).toBe('secret');
    expect(entries[1]?.notes).toBe('personal');
  });

  it('returns just the header for empty vault', () => {
    const csv = entriesToCsv([]);
    expect(csv.trim()).toBe('site,url,username,password,notes');
  });
});

// ── entriesToJson / jsonToEntries ─────────────────────────────────────────────

describe('JSON export/import round-trip', () => {
  const entries: VaultEntry[] = [
    { id: 'abc', site: 'Test', url: 'https://test.com', username: 'u', password: 'p', notes: 'n', createdAt: 1000, updatedAt: 2000 },
  ];

  it('entriesToJson produces valid JSON with correct shape', () => {
    const json = entriesToJson(entries);
    const parsed = JSON.parse(json) as { version: number; entry_count: number; entries: unknown[] };
    expect(parsed.version).toBe(1);
    expect(parsed.entry_count).toBe(1);
    expect(Array.isArray(parsed.entries)).toBe(true);
  });

  it('round-trips through jsonToEntries', () => {
    const json = entriesToJson(entries);
    const imported = jsonToEntries(json);
    expect(imported).toHaveLength(1);
    expect(imported[0]?.password).toBe('p');
    expect(imported[0]?.notes).toBe('n');
  });

  it('jsonToEntries parses Bitwarden JSON format', () => {
    const bwJson = JSON.stringify({
      items: [
        {
          type: 1,
          name: 'BWsite',
          notes: 'bw note',
          login: { username: 'bwuser', password: 'bwpass', uris: [{ uri: 'https://bw.com' }] },
        },
        { type: 2, name: 'Card', notes: '' },  // non-login, should be skipped
      ],
    });
    const imported = jsonToEntries(bwJson);
    expect(imported).toHaveLength(1);
    expect(imported[0]?.username).toBe('bwuser');
    expect(imported[0]?.notes).toBe('bw note');
  });

  it('jsonToEntries throws on unrecognised format', () => {
    expect(() => jsonToEntries(JSON.stringify({ foo: 'bar' }))).toThrow();
  });
});
