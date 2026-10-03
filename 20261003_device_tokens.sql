create table if not exists public.device_tokens (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text default 'android',
  updated_at timestamptz default now()
);
create index if not exists device_tokens_user_idx on public.device_tokens(user_id);

alter table public.device_tokens enable row level security;
create policy "own tokens select" on public.device_tokens for select using (auth.uid() = user_id);
create policy "own tokens insert" on public.device_tokens for insert with check (auth.uid() = user_id);
create policy "own tokens update" on public.device_tokens for update using (auth.uid() = user_id);
create policy "own tokens delete" on public.device_tokens for delete using (auth.uid() = user_id);
