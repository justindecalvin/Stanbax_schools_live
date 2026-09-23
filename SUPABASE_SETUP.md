# Supabase Setup (one-time, ~5 min)

The app reads `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`. Without them it runs in local-only mode (localStorage) exactly as before.

## 1. Create the database schema

Supabase Dashboard → **SQL Editor** → New query → paste all of `supabase/schema.sql` → **Run**.

This creates:
- `credentials` — every account's login, passwords bcrypt-hashed. Never readable from the browser (RLS: no client access at all; only the `verify_login` RPC can check them).
- `sessions` — login tokens issued by `verify_login`, 12-hour expiry.
- `school_state` — the app's data collections (one row per `stanbax_*` key). Public site content (hero slides, gallery, menus…) is readable by everyone; private collections (students, fees, grades, attendance…) require a valid login session.

## 2. Set GitHub Secrets (for the Pages build)

Repo → **Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_ANON_KEY` | `sb_publishable_...` (Dashboard → Settings → API) |
| `ADMIN_PASSWORD` | optional — overrides the built-in admin default |
| `PROPRIETRESS_PASSWORD` | optional — same |

Then push to `main` (or rerun the workflow). The publishable key in the bundle is safe — Row Level Security does the enforcement server-side.

## How it works

- **Login**: `universalLogin`/`login*` call the `verify_login` RPC — the password hash never leaves the server. On success the app gets a session token, hydrates private data, and reloads into the portal.
- **Sync**: every `localStorage.setItem('stanbax_*')` is write-through queued to `school_state` (debounced). On page load, remote rows hydrate localStorage before React mounts.
- **New accounts**: `registerStudent`/`addParent`/`createTutorAccount` create matching credential rows via `create_credential`. Password changes (`changePassword`, `adminResetUserPassword`, `update*`) update the remote hash via `change_password`.
- **Offline/fallback**: if Supabase is unconfigured or unreachable, every path falls back to the local demo credentials and localStorage — nothing breaks.

## Honest limits

- `school_state` write access is "any logged-in session" — per-collection role scoping (e.g. parents can't edit grades) isn't enforced server-side yet; the UI enforces it today.
- Passwords live in both places during the transition: the DB (source of truth for login) and the student/parent records in `school_state` (used for display + local fallback). Keep them in sync via the app's own password-change flows.
