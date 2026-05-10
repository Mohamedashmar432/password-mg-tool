import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';

// Reset both the IndexedDB global AND the module cache before each test
// so that db.ts's cached _db is cleared and openDB() calls fresh IDB.
beforeEach(() => {
  (globalThis as Record<string, unknown>)['indexedDB'] = new IDBFactory();
  vi.resetModules();
});

describe('zerovault-db v2 schema', () => {
  it('creates vault, auth, and session object stores', async () => {
    const { openDB } = await import('../../src/storage/db.js');
    const db = await openDB();
    const storeNames = Array.from(db.objectStoreNames);
    expect(storeNames).toContain('vault');
    expect(storeNames).toContain('auth');
    expect(storeNames).toContain('session');
    db.close();
  });
});
