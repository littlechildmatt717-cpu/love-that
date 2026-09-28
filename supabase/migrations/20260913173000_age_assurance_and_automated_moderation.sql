-- Meet: age assurance provider abstraction + automated moderation metadata
alter table public.moderation_queue
  add column if not exists risk_score smallint not null default 0,
  add column if not exists automated_action text not null default 'none',
  add column if not exists signals jsonb not null default '{}'::jsonb;

alter table public.moderation_queue drop constraint if exists moderation_queue_automated_action_check;
alter table public.moderation_queue add constraint moderation_queue_automated_action_check
  check (automated_action in ('none','allow','review','reject','escalate'));

alter table public.age_verification_requests
  add column if not exists redirect_url text,
  add column if not exists provider_status text;

create index if not exists moderation_queue_status_risk_idx
  on public.moderation_queue (status, risk_level, risk_score desc, created_at desc);

create index if not exists age_verification_user_status_idx
  on public.age_verification_requests (user_id, status, requested_at desc);

-- Queue reports immediately so moderators see them without relying on a later worker.
create or replace function public.queue_report_moderation()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  insert into public.moderation_queue(content_type, content_id, user_id, risk_level, risk_score, automated_action, reason, signals)
  values (
    'report', new.id, new.reported_id,
    case when lower(new.reason) like '%child%' or lower(coalesce(new.details,'')) like '%child%' then 'critical' else 'elevated' end,
    case when lower(new.reason) like '%child%' or lower(coalesce(new.details,'')) like '%child%' then 100 else 60 end,
    case when lower(new.reason) like '%child%' or lower(coalesce(new.details,'')) like '%child%' then 'escalate' else 'review' end,
    'User report submitted',
    jsonb_build_object('reason', left(new.reason,500))
  );
  return new;
end; $$;

drop trigger if exists trg_queue_report_moderation on public.reports;
create trigger trg_queue_report_moderation after insert on public.reports
for each row execute function public.queue_report_moderation();
revoke execute on function public.queue_report_moderation() from public, anon, authenticated;

-- A conservative, deterministic text screen for obvious abuse signals.
create or replace function public.meet_text_risk(p_text text)
returns jsonb language plpgsql immutable set search_path = pg_catalog, public as $$
declare
  t text := lower(coalesce(p_text,''));
  score integer := 0;
  signals text[] := '{}';
begin
  if t ~ '\\b(child|minor|underage|schoolgirl|schoolboy)\\b' then score := greatest(score,100); signals := array_append(signals,'possible_child_safety'); end if;
  if t ~ '(send me (money|cash)|bank details|gift card|crypto|bitcoin|investment opportunity)' then score := greatest(score,80); signals := array_append(signals,'possible_scam'); end if;
  if t ~ '(kill you|hurt you|find you|i know where you live)' then score := greatest(score,85); signals := array_append(signals,'possible_threat'); end if;
  if t ~ '(nude|nudes|explicit photo|sex video)' then score := greatest(score,55); signals := array_append(signals,'sexual_content_request'); end if;
  return jsonb_build_object('score',least(score,100),'signals',to_jsonb(signals));
end; $$;
revoke execute on function public.meet_text_risk(text) from public, anon, authenticated;
