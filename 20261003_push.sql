-- 1. Device tokens
create table if not exists public.device_tokens (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text default 'android',
  updated_at timestamptz default now()
);
create index if not exists device_tokens_user_idx on public.device_tokens(user_id);
alter table public.device_tokens enable row level security;
drop policy if exists "own tokens select" on public.device_tokens;
drop policy if exists "own tokens delete" on public.device_tokens;
create policy "own tokens select" on public.device_tokens for select using (auth.uid() = user_id);
create policy "own tokens delete" on public.device_tokens for delete using (auth.uid() = user_id);

-- Lets a phone claim its token even if a previous user on the same phone owned it.
create or replace function public.register_device_token(p_token text, p_platform text default 'android')
returns void language sql security definer set search_path = public as $$
  insert into public.device_tokens(token, user_id, platform, updated_at)
  values (p_token, auth.uid(), p_platform, now())
  on conflict (token) do update set user_id = auth.uid(), platform = excluded.platform, updated_at = now();
$$;
grant execute on function public.register_device_token(text, text) to authenticated;

-- 2. Triggers that call the push-notify function.
--    EDIT the two placeholders: YOUR_PROJECT_REF and YOUR_WEBHOOK_SECRET (same secret you set on the function).
do $$
declare t text;
begin
  foreach t in array array['messages','short_likes','short_comments','matches'] loop
    execute format('drop trigger if exists push_notify_ins on public.%I', t);
    execute format($f$create trigger push_notify_ins after insert on public.%I for each row execute function supabase_functions.http_request(
      'https://YOUR_PROJECT_REF.supabase.co/functions/v1/push-notify','POST',
      '{"Content-Type":"application/json","x-webhook-secret":"YOUR_WEBHOOK_SECRET"}','{}','5000')$f$, t);
  end loop;
  -- messages also fire when a photo/video is approved
  drop trigger if exists push_notify_upd on public.messages;
  create trigger push_notify_upd after update of media_status on public.messages for each row execute function supabase_functions.http_request(
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/push-notify','POST',
    '{"Content-Type":"application/json","x-webhook-secret":"YOUR_WEBHOOK_SECRET"}','{}','5000');
end $$;

-- 3. Picture messages: allow an empty body when there is media (fixes "messages_body_check")
alter table public.messages drop constraint if exists messages_body_check;
alter table public.messages add constraint messages_body_check
  check (media_path is not null or char_length(trim(body)) > 0);
