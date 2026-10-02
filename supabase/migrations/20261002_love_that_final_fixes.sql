-- love that final backend fixes
-- Safe to run against the existing project.

-- Compatibility table for older app builds that referenced public.chat_room.
create table if not exists public.chat_room (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  message text not null default '',
  created_at timestamptz not null default now()
);

alter table public.chat_room enable row level security;
do $$ begin
  create policy "chat_room_authenticated_read" on public.chat_room for select to authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "chat_room_authenticated_insert_own" on public.chat_room for insert to authenticated with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

-- The onboarding screen saves through this security-definer RPC so profile setup
-- cannot fail because the browser is caught by an overlapping profiles RLS policy.
create or replace function public.save_my_profile(p_payload jsonb)
returns public.profiles
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  uid uuid := auth.uid();
  r public.profiles;
  dob date;
  calculated_age smallint;
  v_seeking text[];
  v_looking text[];
  v_attracted text[];
  v_dates text[];
  v_music text[];
  v_interested text[];
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if not exists (select 1 from public.profiles where id = uid) then
    raise exception 'Profile was not created for this account yet';
  end if;

  dob := nullif(p_payload->>'date_of_birth','')::date;
  if dob is not null then
    calculated_age := extract(year from age(current_date, dob))::smallint;
    if calculated_age < 18 or calculated_age > 120 then
      raise exception 'You must be 18 or over to use love that';
    end if;
  else
    calculated_age := nullif(p_payload->>'age','')::smallint;
  end if;

  select coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'seeking','[]'::jsonb))), '{}'::text[]) into v_seeking;
  select coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'looking_for_gender','[]'::jsonb))), '{}'::text[]) into v_looking;
  select coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'attracted_to','[]'::jsonb))), '{}'::text[]) into v_attracted;
  select coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'ideal_first_date','[]'::jsonb))), '{}'::text[]) into v_dates;
  select coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'music_tastes','[]'::jsonb))), '{}'::text[]) into v_music;
  select coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'interested_body_types','[]'::jsonb))), '{}'::text[]) into v_interested;

  update public.profiles set
    display_name = coalesce(nullif(left(p_payload->>'display_name',80),''), display_name),
    gender = nullif(p_payload->>'gender',''),
    marital_status = nullif(p_payload->>'marital_status',''),
    sexuality = nullif(p_payload->>'sexuality',''),
    date_of_birth = dob,
    age = coalesce(calculated_age, age),
    height_ft = nullif(p_payload->>'height_ft',''),
    height_in = nullif(p_payload->>'height_in',''),
    height = coalesce(nullif(p_payload->>'height',''), height),
    body_type = nullif(p_payload->>'body_type',''),
    job_title = nullif(left(p_payload->>'job_title',160),''),
    goals = nullif(left(p_payload->>'goals',500),''),
    headline = nullif(left(p_payload->>'headline',160),''),
    bio = nullif(left(p_payload->>'bio',2000),''),
    hobbies = nullif(left(p_payload->>'hobbies',1500),''),
    interests = nullif(left(p_payload->>'interests',1500),''),
    drive = case when p_payload ? 'drive' then (p_payload->>'drive')::boolean else drive end,
    drink = case when p_payload ? 'drink' then (p_payload->>'drink')::boolean else drink end,
    smoke = case when p_payload ? 'smoke' then (p_payload->>'smoke')::boolean else smoke end,
    drugs = case when p_payload ? 'drugs' then (p_payload->>'drugs')::boolean else drugs end,
    have_children = case when p_payload ? 'have_children' then (p_payload->>'have_children')::boolean else have_children end,
    want_children = case when p_payload ? 'want_children' then (p_payload->>'want_children')::boolean else want_children end,
    seeking = v_seeking,
    looking_for_gender = v_looking,
    attractive_traits = v_attracted,
    ideal_first_date = v_dates,
    music_tastes = v_music,
    interested_body_types = v_interested,
    religion = nullif(p_payload->>'religion',''),
    embarrassing_moment = nullif(left(p_payload->>'embarrassing_moment',2000),''),
    most_romantic = nullif(left(p_payload->>'most_romantic',2000),''),
    favourite_quote = nullif(left(p_payload->>'favourite_quote',500),''),
    favourite_film = nullif(left(p_payload->>'favourite_film',300),''),
    partner_drink = case when p_payload ? 'partner_drink' then (p_payload->>'partner_drink')::boolean else partner_drink end,
    partner_drugs = case when p_payload ? 'partner_drugs' then (p_payload->>'partner_drugs')::boolean else partner_drugs end,
    partner_drive = case when p_payload ? 'partner_drive' then (p_payload->>'partner_drive')::boolean else partner_drive end,
    partner_smoke = case when p_payload ? 'partner_smoke' then (p_payload->>'partner_smoke')::boolean else partner_smoke end,
    partner_children = case when p_payload ? 'partner_children' then (p_payload->>'partner_children')::boolean else partner_children end,
    identity = coalesce(nullif(p_payload->>'identity',''), identity),
    goal = coalesce(nullif(p_payload->>'goal',''), goal),
    updated_at = now()
  where id = uid
  returning * into r;

  return r;
end;
$$;

grant execute on function public.save_my_profile(jsonb) to authenticated;

-- Make the existing auth trigger explicitly bypass RLS as the function owner.
alter function public.handle_new_user() security definer;

-- Keep the three media buckets present for profile photos, bio/Shorts videos and chat media.
insert into storage.buckets (id,name,public) values
  ('profile-photos','profile-photos',false),
  ('short-videos','short-videos',false),
  ('chat-room','chat-room',false),
  ('private-chat','private-chat',false)
on conflict (id) do nothing;

-- Ensure realtime can publish the main community/chat tables where supported.
do $$ begin
  alter publication supabase_realtime add table public.chat_room_messages;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.short_videos;
exception when duplicate_object then null; when undefined_object then null; end $$;
