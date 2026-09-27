alter table public.private_call_sessions add column if not exists call_type text not null default 'video' check (call_type in ('audio','video'));
