-- ============================================================================
-- STANBAX SCHOOLS — Supabase schema
-- Paste this ENTIRE file into Supabase Dashboard → SQL Editor → Run once.
-- Creates: credentials (hashed passwords), sessions (login tokens),
-- school_state (JSON key-value store mirroring the app's data collections),
-- plus RLS policies so private data requires a valid login session.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. CREDENTIALS — one row per account; passwords stored as bcrypt hashes.
-- ---------------------------------------------------------------------------
create table if not exists public.credentials (
  id            bigint generated always as identity primary key,
  identifier    text not null unique,          -- canonical login id (lowercase)
  aliases       text[] not null default '{}',  -- other accepted identifiers
  password_hash text not null,
  role          text not null check (role in ('admin','proprietress','tutor','student','parent')),
  ref_id        text,                          -- app id: stu-1, tut-3, parent-5...
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. SESSIONS — tokens issued by verify_login; RLS checks them per request.
-- ---------------------------------------------------------------------------
create table if not exists public.sessions (
  token      text primary key,
  role       text not null,
  ref_id     text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '12 hours'
);
create index if not exists sessions_expires_idx on public.sessions (expires_at);

-- ---------------------------------------------------------------------------
-- 3. SCHOOL_STATE — one row per app collection (the ~50 stanbax_* keys).
--    data is jsonb; is_public marks collections the anonymous website needs
--    (hero slides, gallery, menus...). Everything else requires a session.
-- ---------------------------------------------------------------------------
create table if not exists public.school_state (
  key        text primary key,
  data       jsonb,
  is_public  boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.request_session_token()
returns text language sql stable as $$
  select nullif(current_setting('request.headers', true)::jsonb ->> 'x-stanbax-session', '')
$$;

create or replace function public.valid_session()
returns boolean language sql stable security definer set search_path = public, extensions as $$
  select exists (
    select 1 from public.sessions s
    where s.token = public.request_session_token()
      and s.expires_at > now()
  )
$$;

create or replace function public.session_role()
returns text language sql stable security definer set search_path = public, extensions as $$
  select s.role from public.sessions s
  where s.token = public.request_session_token()
    and s.expires_at > now()
  limit 1
$$;

-- ---------------------------------------------------------------------------
-- 4. RPC: verify_login — the ONLY way to check a password. Rate-limit safe:
--    wrong passwords return ok:false, no hashes ever leave the server.
-- ---------------------------------------------------------------------------
create or replace function public.verify_login(p_identifier text, p_password text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  c record;
  t text;
begin
  select * into c from public.credentials
   where lower(identifier) = lower(trim(p_identifier))
      or lower(ref_id) = lower(trim(p_identifier))
      or exists (select 1 from unnest(aliases) a
                 where lower(replace(a, ' ', '')) = lower(replace(trim(p_identifier), ' ', '')))
      -- phone contains-match (parents log in by digits, any formatting)
      or exists (select 1 from unnest(aliases) a
                 where a ~ '^[+0-9 ()-]+$'
                   and length(regexp_replace(trim(p_identifier), '[^0-9]', '', 'g')) >= 7
                   and regexp_replace(a, '[^0-9]', '', 'g')
                       like '%' || regexp_replace(trim(p_identifier), '[^0-9]', '', 'g') || '%');
  if not found then
    return jsonb_build_object('ok', false, 'message', 'No account matches this identifier.');
  end if;
  if c.password_hash <> crypt(p_password, c.password_hash) then
    return jsonb_build_object('ok', false, 'message', 'Incorrect password.');
  end if;
  t := encode(gen_random_bytes(24), 'hex');
  insert into public.sessions (token, role, ref_id) values (t, c.role, c.ref_id);
  delete from public.sessions where expires_at < now();
  return jsonb_build_object('ok', true, 'token', t, 'role', c.role, 'ref_id', c.ref_id);
end $$;

create or replace function public.logout_session(p_token text)
returns void language sql security definer set search_path = public, extensions as $$
  delete from public.sessions where token = p_token
$$;

-- change_password: user must know the old password (staff roles may reset
-- without it — sessions carry role, enforced inside the function).
create or replace function public.change_password(
  p_identifier text, p_old_password text, p_new_password text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  c record;
  r text := public.session_role();
begin
  if r is null then
    return jsonb_build_object('ok', false, 'message', 'Not signed in.');
  end if;
  select * into c from public.credentials
   where lower(identifier) = lower(trim(p_identifier))
      or lower(ref_id) = lower(trim(p_identifier));
  if not found then
    return jsonb_build_object('ok', false, 'message', 'Account not found.');
  end if;
  if r not in ('admin', 'proprietress', 'tutor')
     and c.password_hash <> crypt(coalesce(p_old_password, ''), c.password_hash) then
    return jsonb_build_object('ok', false, 'message', 'Current password incorrect.');
  end if;
  update public.credentials
     set password_hash = crypt(p_new_password, gen_salt('bf'))
   where id = c.id;
  return jsonb_build_object('ok', true);
end $$;

-- create_credential: any valid session (admin adds students/parents/tutors).
create or replace function public.create_credential(
  p_identifier text, p_password text, p_role text, p_ref_id text, p_aliases text[] default '{}')
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.valid_session() then
    return jsonb_build_object('ok', false, 'message', 'Not signed in.');
  end if;
  insert into public.credentials (identifier, aliases, password_hash, role, ref_id)
  values (lower(trim(p_identifier)), p_aliases, crypt(p_password, gen_salt('bf')), p_role, p_ref_id)
  on conflict (identifier) do update
    set password_hash = excluded.password_hash,
        aliases       = excluded.aliases,
        role          = excluded.role,
        ref_id        = excluded.ref_id;
  return jsonb_build_object('ok', true);
end $$;

-- put_states / delete_states: the ONLY write path for school_state — they
-- upsert data while preserving each row's is_public flag (so the anonymous
-- website keeps working after the first write to a public collection).
create or replace function public.put_states(p_items jsonb)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.valid_session() then
    raise exception 'Not signed in';
  end if;
  insert into public.school_state (key, data)
    select (i->>'key'), (i->'data') from jsonb_array_elements(p_items) i
  on conflict (key) do update set data = excluded.data, updated_at = now();
end $$;

create or replace function public.delete_states(p_keys text[])
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.valid_session() then
    raise exception 'Not signed in';
  end if;
  delete from public.school_state where key = any(p_keys);
end $$;

-- ---------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
alter table public.credentials  enable row level security;
alter table public.sessions     enable row level security;
alter table public.school_state enable row level security;

-- credentials & sessions: NO direct client access at all (RPCs only).
revoke all on public.credentials from anon, authenticated;
revoke all on public.sessions    from anon, authenticated;

-- school_state: read public rows anonymously; private rows need a session.
drop policy if exists "public read"  on public.school_state;
drop policy if exists "session read" on public.school_state;
drop policy if exists "session write" on public.school_state;

create policy "public read" on public.school_state
  for select to anon, authenticated
  using (is_public);

create policy "session read" on public.school_state
  for select to anon, authenticated
  using (public.valid_session());

create policy "session write" on public.school_state
  for all to anon, authenticated
  using (public.valid_session())
  with check (public.valid_session());

grant execute on function public.verify_login(text, text)      to anon, authenticated;
grant execute on function public.logout_session(text)          to anon, authenticated;
grant execute on function public.change_password(text, text, text) to anon, authenticated;
grant execute on function public.create_credential(text, text, text, text, text[]) to anon, authenticated;
grant execute on function public.put_states(jsonb) to anon, authenticated;
grant execute on function public.delete_states(text[]) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. SEED CREDENTIALS (demo accounts — matches src/data/schoolData.ts)
-- ---------------------------------------------------------------------------
insert into public.credentials (identifier, aliases, password_hash, role, ref_id) values
  ('admin',        array['administrator','principal','stanbax','admin@stanbaxschools.edu.ng'], crypt('Justin2000.', gen_salt('bf')), 'admin', 'admin'),
  ('proprietress', array['headmistress','mrs.bello','proprietress@stanbaxschools.edu.ng'],      crypt('Proprietress2025!', gen_salt('bf')), 'proprietress', 'proprietress'),

  ('olumide.ogunleye@stanbaxschools.edu.ng',  array['stx/fac/001','tut-1','mr. olumide ogunleye'],   crypt('stanbax2025', gen_salt('bf')), 'tutor', 'tut-1'),
  ('folake.adeyemi@stanbaxschools.edu.ng',    array['stx/fac/002','tut-2','mrs. folake adeyemi'],    crypt('stanbax2025', gen_salt('bf')), 'tutor', 'tut-2'),
  ('chukwuemeka.obi@stanbaxschools.edu.ng',   array['stx/fac/003','tut-3','dr. chukwuemeka obi'],    crypt('stanbax2025', gen_salt('bf')), 'tutor', 'tut-3'),
  ('chidi.okafor@stanbaxschools.edu.ng',      array['stx/fac/004','tut-4','dr. chidi okafor'],       crypt('stanbax2025', gen_salt('bf')), 'tutor', 'tut-4'),
  ('nkechi.nwosu@stanbaxschools.edu.ng',      array['stx/fac/005','tut-5','dr. (mrs) nkechi nwosu'], crypt('stanbax2025', gen_salt('bf')), 'tutor', 'tut-5'),
  ('emmanuel.danjuma@stanbaxschools.edu.ng',  array['stx/fac/006','tut-6','mr. emmanuel danjuma'],   crypt('stanbax2025', gen_salt('bf')), 'tutor', 'tut-6'),
  ('dupont@stanbaxschools.edu.ng',            array['stx/fac/007','tut-7','madame dupont'],          crypt('stanbax2025', gen_salt('bf')), 'tutor', 'tut-7'),

  ('stx/2023/042', array['stx2023042@stanbaxschools.edu.ng','stu-1','tiwa adeleke'],       crypt('stanbax2025', gen_salt('bf')), 'student', 'stu-1'),
  ('stx/2023/043', array['stx2023043@stanbaxschools.edu.ng','stu-2','babatunde akindele'], crypt('stanbax2025', gen_salt('bf')), 'student', 'stu-2'),
  ('stx/2023/044', array['stx2023044@stanbaxschools.edu.ng','stu-3','chidera okafor'],     crypt('stanbax2025', gen_salt('bf')), 'student', 'stu-3'),
  ('stx/2023/045', array['stx2023045@stanbaxschools.edu.ng','stu-4','damilola fashola'],   crypt('stanbax2025', gen_salt('bf')), 'student', 'stu-4'),
  ('stx/2023/046', array['stx2023046@stanbaxschools.edu.ng','stu-5','efe oghomwen'],       crypt('stanbax2025', gen_salt('bf')), 'student', 'stu-5'),
  ('stx/2023/047', array['stx2023047@stanbaxschools.edu.ng','stu-6','farouk danjuma'],     crypt('stanbax2025', gen_salt('bf')), 'student', 'stu-6'),
  ('stx/2024/101', array['stx2024101@stanbaxschools.edu.ng','stu-7','amina bello'],        crypt('stanbax2025', gen_salt('bf')), 'student', 'stu-7'),
  ('stx/2024/102', array['stx2024102@stanbaxschools.edu.ng','stu-8','kenechukwu nnamdi'],  crypt('stanbax2025', gen_salt('bf')), 'student', 'stu-8'),

  ('adeleke.family@gmail.com',   array['+2348034456789','parent-1','chief & mrs. adebayo adeleke'], crypt('parent2025', gen_salt('bf')), 'parent', 'parent-1'),
  ('akindele.eng@yahoo.com',     array['+2348028876543','parent-2','engr. & dr. akindele'],         crypt('parent2025', gen_salt('bf')), 'parent', 'parent-2'),
  ('okafor.family@gmail.com',    array['+2348091123456','parent-3','mr. & mrs. obinna okafor'],     crypt('parent2025', gen_salt('bf')), 'parent', 'parent-3'),
  ('fashola.law@gmail.com',      array['+2348057765432','parent-4','barrister fashola'],            crypt('parent2025', gen_salt('bf')), 'parent', 'parent-4'),
  ('oghomwen.clinic@gmail.com',  array['+2348039987766','parent-5','dr. osas oghomwen'],            crypt('parent2025', gen_salt('bf')), 'parent', 'parent-5'),
  ('danjuma.holdings@gmail.com', array['+2348074432211','parent-6','alhaji & hajia danjuma'],       crypt('parent2025', gen_salt('bf')), 'parent', 'parent-6'),
  ('bello.family@gmail.com',     array['+2348023345566','parent-7','mr. & mrs. bello'],             crypt('parent2025', gen_salt('bf')), 'parent', 'parent-7'),
  ('nnamdi.family@gmail.com',    array['+2348056678899','parent-8','chief nnamdi'],                 crypt('parent2025', gen_salt('bf')), 'parent', 'parent-8')
on conflict (identifier) do nothing;

-- Mark the public-facing collections (anonymous website visitors read these).
insert into public.school_state (key, is_public) values
  ('stanbax_school_info', true),
  ('stanbax_hero_slides', true),
  ('stanbax_hero_highlights', true),
  ('stanbax_key_pillars', true),
  ('stanbax_key_pillars_header', true),
  ('stanbax_about_content', true),
  ('stanbax_academic_programs', true),
  ('stanbax_featured_courses', true),
  ('stanbax_clubs_list', true),
  ('stanbax_house_standings', true),
  ('stanbax_bus_routes', true),
  ('stanbax_meal_menu', true),
  ('stanbax_calendar_events', true),
  ('stanbax_testimonials', true),
  ('stanbax_testimonials_header', true),
  ('stanbax_faq_items', true),
  ('stanbax_faq_header', true),
  ('stanbax_app_images', true),
  ('stanbax_gallery_images', true),
  ('stanbax_news_articles', true),
  ('stanbax_popup_notice', true),
  ('stanbax_navbar_content', true),
  ('stanbax_footer_content', true)
on conflict (key) do nothing;
