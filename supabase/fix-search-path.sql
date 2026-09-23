-- Fix: crypt/gen_salt live in the extensions schema on Supabase.
-- Run once in SQL Editor if schema.sql was run before this fix.
alter function public.request_session_token() set search_path = public, extensions;
alter function public.valid_session() set search_path = public, extensions;
alter function public.session_role() set search_path = public, extensions;
alter function public.verify_login(text, text) set search_path = public, extensions;
alter function public.logout_session(text) set search_path = public, extensions;
alter function public.change_password(text, text, text) set search_path = public, extensions;
alter function public.create_credential(text, text, text, text, text[]) set search_path = public, extensions;
