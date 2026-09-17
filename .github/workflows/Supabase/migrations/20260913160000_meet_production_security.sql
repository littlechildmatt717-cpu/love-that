create schema if not exists private;

alter table public.profiles
  add column if not exists age_verified_at timestamptz,
  add column if not exists moderation_status text not null default 'active',
  add column if not exists last_seen_at timestamptz;

alter table public.profiles drop constraint if exists profiles_moderation_status_check;
alter table public.profiles add constraint profiles_moderation_status_check check (moderation_status in ('active','review','suspended','banned'));

create unique index if not exists blocks_pair_uidx on public.blocks (blocker_id, blocked_id);
create unique index if not exists profile_photos_user_sort_uidx on public.profile_photos (user_id, sort_order);
create index if not exists profile_photos_user_idx on public.profile_photos (user_id);
create index if not exists messages_sender_idx on public.messages (sender_id);
create index if not exists reports_reporter_idx on public.reports (reporter_id);
create index if not exists reports_reported_idx on public.reports (reported_id);

alter table public.matches drop constraint if exists matches_user_a_user_b_key;
alter table public.matches add constraint matches_user_a_user_b_key unique (user_a,user_b);
alter table public.conversations drop constraint if exists conversations_user_a_user_b_key;
alter table public.conversations add constraint conversations_user_a_user_b_key unique (user_a,user_b);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin new.updated_at = now(); return new; end; $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  insert into public.profiles (id, display_name, age, identity, location, headline, bio, goal, seeking, platform)
  values (
    new.id,
    coalesce(nullif(left(new.raw_user_meta_data->>'display_name',80),''), 'New member'),
    greatest(18, least(coalesce((new.raw_user_meta_data->>'age')::smallint, 18), 120)),
    case when new.raw_user_meta_data->>'identity' in ('woman','man','non_binary','trans_woman','trans_man') then new.raw_user_meta_data->>'identity' else 'non_binary' end,
    left(new.raw_user_meta_data->>'location',200), left(new.raw_user_meta_data->>'headline',160), left(new.raw_user_meta_data->>'bio',2000),
    case when new.raw_user_meta_data->>'goal' in ('relationship','casual_dating','new_friends','flirty_chat','not_sure') then new.raw_user_meta_data->>'goal' else null end,
    coalesce(array(select jsonb_array_elements_text(coalesce(new.raw_user_meta_data->'seeking','[]'::jsonb))), '{}'::text[]),
    case when new.raw_user_meta_data->>'platform' in ('singles','couples','friend_zone','after_dark') then new.raw_user_meta_data->>'platform' else 'singles' end
  ) on conflict (id) do nothing;
  return new;
exception when others then raise log 'Meet profile creation failed for user %: %', new.id, sqlerrm; return new;
end; $$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('profile-photos','profile-photos',false,10485760,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "profile_photos_delete_own_folder" on storage.objects;
drop policy if exists "profile_photos_update_own_folder" on storage.objects;
drop policy if exists "profile_photos_upload_own_folder" on storage.objects;
create policy "profile photos owner insert" on storage.objects for insert to authenticated with check (bucket_id='profile-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "profile photos owner select" on storage.objects for select to authenticated using (bucket_id='profile-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "profile photos owner update" on storage.objects for update to authenticated using (bucket_id='profile-photos' and (storage.foldername(name))[1]=(select auth.uid())::text) with check (bucket_id='profile-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "profile photos owner delete" on storage.objects for delete to authenticated using (bucket_id='profile-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);

do $$ begin alter publication supabase_realtime add table public.messages; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.matches; exception when duplicate_object then null; end $$;
