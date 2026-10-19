import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

/**
 * Doctors and nurses a patient saved to book later.
 *
 * Signed-in patients keep them on their account (so they follow the patient to any phone or browser); this module keeps a local
 * copy so the page is instant and still works offline. Anyone else (a guest, a practitioner) keeps them in this browser only.
 * Bookmarks saved in this browser before the account copy existed are moved up once, the first time the patient opens the page.
 */
const LEGACY_KEY = 'saved_practitioners';
const cacheKey = (userId: string) => `saved_practitioners:${userId}`;

interface Who { id?: string | null; role?: string | null }

const listeners = new Set<() => void>();
let current: { owner: string; ids: string[] } = { owner: '', ids: [] };
const ownerOf = (who: Who) => (who.role === 'patient' && who.id ? who.id : 'local');

function readCache(owner: string): string[] {
  try { const v = JSON.parse(localStorage.getItem(owner === 'local' ? LEGACY_KEY : cacheKey(owner)) || '[]'); return Array.isArray(v) ? v.filter(x => typeof x === 'string') : []; } catch { return []; }
}
function writeCache(owner: string, ids: string[]) {
  try { localStorage.setItem(owner === 'local' ? LEGACY_KEY : cacheKey(owner), JSON.stringify(ids)); } catch { /* storage unavailable */ }
}
function publish(owner: string, ids: string[]) {
  current = { owner, ids };
  writeCache(owner, ids);
  listeners.forEach(f => f());
}

async function api(method: string, url: string, body?: unknown): Promise<string[] | null> {
  try {
    const r = await fetch(url, { method, headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    const d = await r.json();
    return r.ok && d.status === 'success' && Array.isArray(d.data) ? d.data : null;
  } catch { return null; }
}

let syncing: Promise<void> | null = null;
/** Load the account's list; first move up anything this browser held from before. Safe to call many times. */
export function syncSavedProviders(who: Who): Promise<void> {
  const owner = ownerOf(who);
  if (current.owner !== owner) current = { owner, ids: readCache(owner) };
  if (owner === 'local') { listeners.forEach(f => f()); return Promise.resolve(); }
  if (syncing) return syncing;
  syncing = (async () => {
    // Bookmarks from the old browser-only store (and this account's cached copy) are offered to the server; it keeps the valid ones
    let legacy: string[] = [];
    try { legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]'); } catch { /* ignore */ }
    const offer = Array.from(new Set([...(Array.isArray(legacy) ? legacy : []), ...readCache(owner)])).filter(x => typeof x === 'string');
    const merged = offer.length > 0 ? await api('POST', '/api/me/saved/import', { ids: offer }) : await api('GET', '/api/me/saved');
    if (merged) {
      try { localStorage.removeItem(LEGACY_KEY); } catch { /* ignore */ }
      publish(owner, merged);
    }
  })().finally(() => { syncing = null; });
  return syncing;
}

export async function saveProvider(who: Who, id: string): Promise<boolean> {
  const owner = ownerOf(who);
  if (current.owner !== owner) current = { owner, ids: readCache(owner) };
  if (current.ids.includes(id)) return true;
  const before = current.ids;
  publish(owner, [...before, id]); // instant
  if (owner === 'local') return true;
  const server = await api('PUT', `/api/me/saved/${encodeURIComponent(id)}`);
  if (server) { publish(owner, server); return true; }
  publish(owner, before); // the server said no: undo the instant change
  return false;
}

export async function unsaveProvider(who: Who, id: string): Promise<boolean> {
  const owner = ownerOf(who);
  if (current.owner !== owner) current = { owner, ids: readCache(owner) };
  const before = current.ids;
  publish(owner, before.filter(x => x !== id));
  if (owner === 'local') return true;
  const server = await api('DELETE', `/api/me/saved/${encodeURIComponent(id)}`);
  if (server) { publish(owner, server); return true; }
  publish(owner, before);
  return false;
}

/** Saved practitioner ids for the signed-in person, kept in step across every screen that shows or changes them. */
export function useSavedProviders(who: Who) {
  const owner = ownerOf(who);
  const subscribe = useCallback((cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; }, []);
  useSyncExternalStore(subscribe, () => current);
  const [failed, setFailed] = useState(false);

  useEffect(() => { void syncSavedProviders(who); }, [owner]);

  const ids = current.owner === owner ? current.ids : readCache(owner);
  const add = useCallback(async (id: string) => { const ok = await saveProvider(who, id); setFailed(!ok); return ok; }, [owner]);
  const remove = useCallback(async (id: string) => { const ok = await unsaveProvider(who, id); setFailed(!ok); return ok; }, [owner]);
  return { ids, add, remove, failed };
}
