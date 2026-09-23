-- Adds the write RPCs the app's sync layer uses. Run once in SQL Editor.
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

grant execute on function public.put_states(jsonb) to anon, authenticated;
grant execute on function public.delete_states(text[]) to anon, authenticated;
