alter table public.profiles
  add column if not exists height_cm smallint,
  add column if not exists body_type text,
  add column if not exists religion text,
  add column if not exists marital_status text,
  add column if not exists job_title text,
  add column if not exists interests text not null default '',
  add column if not exists hobbies text not null default '',
  add column if not exists interested_body_types text[] not null default '{}'::text[],
  add column if not exists attractive_traits text[] not null default '{}'::text[];

update public.profiles
set interests = coalesce(interests, ''),
    hobbies = coalesce(hobbies, ''),
    interested_body_types = coalesce(interested_body_types, '{}'::text[]),
    attractive_traits = coalesce(attractive_traits, '{}'::text[]);

create index if not exists profiles_body_type_idx on public.profiles(body_type);
create index if not exists profiles_religion_idx on public.profiles(religion);
create index if not exists profiles_job_title_idx on public.profiles(job_title);
