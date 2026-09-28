-- meet production security baseline for Supabase/Postgres
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 40),
  age int not null check (age >= 18 and age <= 120),
  identity text not null,
  location text,
  headline text,
  bio text,
  goal text not null,
  seeking text not null,
  photo_urls text[] not null default '{}',
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references public.profiles(id) on delete cascade,
  to_user uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(from_user,to_user),
  check(from_user <> to_user)
);

create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(blocker_id,blocked_id),
  check(blocker_id <> blocked_id)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_a,user_b),
  check(user_a <> user_b)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references public.matches(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check(char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check(char_length(reason) between 3 and 100),
  details text check(char_length(details) <= 2000),
  status text not null default 'open' check(status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  check(reporter_id <> reported_user_id)
);

create table if not exists public.platform_memberships (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  singles boolean not null default true,
  couples boolean not null default false,
  friends boolean not null default false,
  after_dark boolean not null default false,
  after_dark_verified boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.likes enable row level security;
alter table public.blocks enable row level security;
alter table public.matches enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.reports enable row level security;
alter table public.platform_memberships enable row level security;

-- Profiles: public discovery only exposes visible profiles; users can edit their own.
create policy "visible profiles are readable" on public.profiles for select to authenticated
using (is_visible = true or id = auth.uid());
create policy "own profile insert" on public.profiles for insert to authenticated
with check (id = auth.uid() and age >= 18);
create policy "own profile update" on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid() and age >= 18);

create policy "own likes readable" on public.likes for select to authenticated
using (from_user = auth.uid() or to_user = auth.uid());
create policy "own likes insert" on public.likes for insert to authenticated
with check (from_user = auth.uid());

create policy "own blocks readable" on public.blocks for select to authenticated
using (blocker_id = auth.uid());
create policy "own blocks insert" on public.blocks for insert to authenticated
with check (blocker_id = auth.uid());
create policy "own blocks delete" on public.blocks for delete to authenticated
using (blocker_id = auth.uid());

create policy "match participants readable" on public.matches for select to authenticated
using (user_a = auth.uid() or user_b = auth.uid());

create policy "conversation participants readable" on public.conversations for select to authenticated
using (exists(select 1 from public.matches m where m.id = match_id and (m.user_a = auth.uid() or m.user_b = auth.uid())));

create policy "conversation participants messages readable" on public.messages for select to authenticated
using (exists(select 1 from public.conversations c join public.matches m on m.id=c.match_id where c.id=conversation_id and (m.user_a=auth.uid() or m.user_b=auth.uid())));
create policy "send only as self in own conversation" on public.messages for insert to authenticated
with check (sender_id = auth.uid() and exists(select 1 from public.conversations c join public.matches m on m.id=c.match_id where c.id=conversation_id and (m.user_a=auth.uid() or m.user_b=auth.uid())));

create policy "reporter can create reports" on public.reports for insert to authenticated
with check (reporter_id = auth.uid() and reporter_id <> reported_user_id);
create policy "reporter can view own reports" on public.reports for select to authenticated
using (reporter_id = auth.uid());

create policy "own platform membership" on public.platform_memberships for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Prevent users from manipulating security-sensitive fields through direct updates.
create or replace function public.protect_profile_fields() returns trigger language plpgsql as $$
begin
  if new.id <> old.id or new.age < 18 then raise exception 'invalid profile update'; end if;
  new.updated_at := now();
  return new;
end $$;
create trigger protect_profile_fields before update on public.profiles
for each row execute function public.protect_profile_fields();

create or replace function public.normalize_match(a uuid,b uuid) returns table(user_a uuid,user_b uuid) language sql immutable as $$
 select least(a,b), greatest(a,b);
$$;

create index if not exists likes_from_idx on public.likes(from_user);
create index if not exists likes_to_idx on public.likes(to_user);
create index if not exists blocks_pair_idx on public.blocks(blocker_id,blocked_id);
create index if not exists messages_conversation_created_idx on public.messages(conversation_id,created_at);
create index if not exists reports_status_created_idx on public.reports(status,created_at);
