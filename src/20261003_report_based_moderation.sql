-- ===== PART 1: remove pre-approval of chat pictures, GIFs and videos =====
-- (runs AFTER insert as the table owner, because the insert policy only allows 'pending')
drop trigger if exists zz_auto_approve_chat_media on public.messages;
drop function if exists public.auto_approve_chat_media();

create or replace function public.auto_approve_chat_media()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.media_path is not null and new.media_type in ('image','gif','video') then
    update public.messages set media_status = 'approved' where id = new.id;
  end if;
  return null;
end $$;

create trigger zz_auto_approve_chat_media
  after insert on public.messages
  for each row execute function public.auto_approve_chat_media();

-- release anything already waiting (rejected items are left alone)
update public.messages set media_status = 'approved'
where media_status = 'pending' and media_type in ('image','gif','video');

-- ===== PART 2: reports on pictures and videos =====
create table if not exists public.media_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null,
  content_type text not null check (content_type in ('message','short')),
  content_id text not null,
  reason text not null,
  status text not null default 'open' check (status in ('open','actioned','dismissed')),
  evidence_bucket text,
  evidence_path text,
  action text,
  handled_by uuid,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists media_reports_once on public.media_reports(reporter_id, content_type, content_id);
create index if not exists media_reports_open_idx on public.media_reports(status, created_at desc);
create index if not exists media_reports_user_idx on public.media_reports(reported_user_id);

alter table public.media_reports enable row level security;
drop policy if exists "report media insert" on public.media_reports;
drop policy if exists "report media read own" on public.media_reports;
create policy "report media insert" on public.media_reports for insert to authenticated
  with check (reporter_id = auth.uid() and reported_user_id <> auth.uid());
create policy "report media read own" on public.media_reports for select to authenticated
  using (reporter_id = auth.uid());
