import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const SESSION_KEY = 'stanbax_db_session';
let sessionToken: string | null = null;
try { sessionToken = sessionStorage.getItem(SESSION_KEY); } catch { /* ignore */ }

const authedFetch: typeof fetch = (input, init) => {
  if (!sessionToken) return fetch(input, init);
  const headers = new Headers(init?.headers);
  headers.set('x-stanbax-session', sessionToken);
  return fetch(input, { ...init, headers });
};

export const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { fetch: authedFetch },
      })
    : null;

export const isRemoteEnabled = (): boolean => supabase !== null;

export const setDbSession = (token: string | null): void => {
  sessionToken = token;
  try {
    if (token) sessionStorage.setItem(SESSION_KEY, token);
    else sessionStorage.removeItem(SESSION_KEY);
  } catch { /* ignore */ }
};

export interface VerifyLoginResult {
  ok: boolean;
  token?: string;
  role?: string;
  refId?: string;
  message?: string;
  unreachable?: boolean;
}

export const remoteVerifyLogin = async (
  identifier: string,
  password: string
): Promise<VerifyLoginResult> => {
  if (!supabase) return { ok: false, unreachable: true };
  try {
    const { data, error } = await supabase.rpc('verify_login', {
      p_identifier: identifier,
      p_password: password,
    });
    if (error) return { ok: false, unreachable: true, message: error.message };
    const d = data as Record<string, unknown> | null;
    if (!d || d.ok !== true) {
      return { ok: false, message: (d?.message as string) || 'Invalid credentials.' };
    }
    return {
      ok: true,
      token: d.token as string,
      role: d.role as string,
      refId: d.ref_id as string,
    };
  } catch {
    return { ok: false, unreachable: true };
  }
};

// After a remote-verified login, hydrate (now including private collections
// unlocked by the session token) then reload so every mounted state picks up
// the shared data. The portal section is stashed so App lands back in it.
export const completeRemoteLogin = async (token: string, targetSection: string): Promise<never> => {
  setDbSession(token);
  try { sessionStorage.setItem('stanbax_resume_section', targetSection); } catch { /* ignore */ }
  await hydrateFromSupabase();
  window.location.reload();
  // unreachable in a real browser, but satisfies typing in tests
  return new Promise<never>(() => {});
};

export const remoteLogout = async (): Promise<void> => {
  if (!supabase || !sessionToken) return;
  try {
    await supabase.rpc('logout_session', { p_token: sessionToken });
  } catch { /* ignore */ }
  setDbSession(null);
};

export const remoteChangePassword = async (
  identifier: string,
  oldPassword: string | null,
  newPassword: string
): Promise<void> => {
  if (!supabase || !sessionToken) return;
  try {
    await supabase.rpc('change_password', {
      p_identifier: identifier,
      p_old_password: oldPassword,
      p_new_password: newPassword,
    });
  } catch { /* ignore */ }
};

export const remoteCreateCredential = async (
  identifier: string,
  password: string,
  role: string,
  refId: string,
  aliases: string[] = []
): Promise<void> => {
  if (!supabase || !sessionToken) return;
  try {
    await supabase.rpc('create_credential', {
      p_identifier: identifier,
      p_password: password,
      p_role: role,
      p_ref_id: refId,
      p_aliases: aliases,
    });
  } catch { /* ignore */ }
};

// ---------------------------------------------------------------------------
// Write-through: every localStorage.setItem('stanbax_*', ...) also queues a
// remote upsert into the school_state KV table (debounced, best-effort).
// ---------------------------------------------------------------------------

const pendingWrites = new Map<string, string | null>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let suppressRemote = false;

const flushWrites = async () => {
  flushTimer = null;
  if (!supabase || !sessionToken) { pendingWrites.clear(); return; }
  const batch = [...pendingWrites.entries()];
  pendingWrites.clear();
  const upserts = batch
    .filter(([, v]) => v !== null)
    .map(([key, v]) => ({ key, data: JSON.parse(v as string) }));
  const deletes = batch.filter(([, v]) => v === null).map(([k]) => k);
  try {
    // RPCs preserve the is_public flag on the row; direct table writes can't
    if (upserts.length) await supabase.rpc('put_states', { p_items: upserts });
    if (deletes.length) await supabase.rpc('delete_states', { p_keys: deletes });
  } catch { /* best-effort; local copy already saved */ }
};

const scheduleFlush = () => {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => { void flushWrites(); }, 400);
};

export const queueRemoteWrite = (key: string, serialized: string | null): void => {
  if (!isRemoteEnabled() || suppressRemote) return;
  pendingWrites.set(key, serialized);
  scheduleFlush();
};

let patchInstalled = false;
export const installLocalStorageSync = (): void => {
  if (patchInstalled || typeof localStorage === 'undefined') return;
  patchInstalled = true;
  const origSet = localStorage.setItem.bind(localStorage);
  const origRemove = localStorage.removeItem.bind(localStorage);
  localStorage.setItem = (key: string, value: string) => {
    origSet(key, value);
    if (key.startsWith('stanbax_')) queueRemoteWrite(key, value);
  };
  localStorage.removeItem = (key: string) => {
    origRemove(key);
    if (key.startsWith('stanbax_')) queueRemoteWrite(key, null);
  };
};

// ---------------------------------------------------------------------------
// Hydration: pull all readable rows into localStorage before React renders,
// so every existing useState(localStorage.getItem(...)) initializer picks up
// the shared remote state. Public rows are readable without a session;
// private rows unlock after login (see PUBLIC_KEYS in schema.sql).
// ---------------------------------------------------------------------------

export const hydrateFromSupabase = async (): Promise<void> => {
  if (!supabase) return;
  try {
    const { data, error } = await supabase
      .from('school_state')
      .select('key, data');
    if (error || !data) return;
    const remoteKeys = new Set<string>();
    suppressRemote = true;
    try {
      for (const row of data as Array<{ key: string; data: unknown }>) {
        // Public-key marker rows are seeded with data=null — skip them so
        // localStorage never holds the literal 'null' (which crashes the
        // JSON.parse initializers) and bootstrap can fill them instead.
        if (row.data === null || row.data === undefined) continue;
        remoteKeys.add(row.key);
        localStorage.setItem(row.key, JSON.stringify(row.data));
      }
      // Heal 'null'/'undefined' entries written by an earlier version.
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k?.startsWith('stanbax_')) {
          const v = localStorage.getItem(k);
          if (v === 'null' || v === 'undefined') localStorage.removeItem(k);
        }
      }
    } finally {
      suppressRemote = false;
    }
    // Bootstrap: push local seeds up for any key missing remotely. Writes are
    // dropped silently without a session token; they retry on the next hydrate
    // after login so remote converges to the seeded demo data.
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('stanbax_') && !remoteKeys.has(k)) {
        queueRemoteWrite(k, localStorage.getItem(k));
      }
    }
  } catch { /* offline → local seeds remain */ }
};
