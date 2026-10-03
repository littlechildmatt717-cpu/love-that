-- love that: database fixes for the new features
-- Run in Supabase > SQL Editor. Assumes short_videos.id is uuid.

-- 1) Chat room: let every signed-in user see photos/videos posted in the room.
drop policy if exists "chat_room_media_read_all" on storage.objects;
create policy "chat_room_media_read_all" on storage.objects
  for select to authenticated using (bucket_id = 'chat-room');

-- 2) Shorts: let every signed-in user see shorts and play the video files.
--    NOTE: this shows ALL rows. If short_videos has a moderation/status column,
--    use: using (user_id = auth.uid() or <status_column> = 'approved')
drop policy if exists "short_videos_read_all" on public.short_videos;
create policy "short_videos_read_all" on public.short_videos
  for select to authenticated using (true);

drop policy if exists "short_videos_files_read_all" on storage.objects;
create policy "short_videos_files_read_all" on storage.objects
  for select to authenticated using (bucket_id = 'short-videos');

-- 3) Love hearts on shorts
create table if not exists public.short_likes (
  video_id uuid not null references public.short_videos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (video_id, user_id)
);
alter table public.short_likes enable row level security;
drop policy if exists "short_likes_read" on public.short_likes;
drop policy if exists "short_likes_insert" on public.short_likes;
drop policy if exists "short_likes_delete" on public.short_likes;
create policy "short_likes_read" on public.short_likes for select to authenticated using (true);
create policy "short_likes_insert" on public.short_likes for insert to authenticated with check (user_id = auth.uid());
create policy "short_likes_delete" on public.short_likes for delete to authenticated using (user_id = auth.uid());

-- 4) Comments on shorts
create table if not exists public.short_comments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.short_videos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists short_comments_video_idx on public.short_comments(video_id, created_at);
alter table public.short_comments enable row level security;
drop policy if exists "short_comments_read" on public.short_comments;
drop policy if exists "short_comments_insert" on public.short_comments;
drop policy if exists "short_comments_delete" on public.short_comments;
create policy "short_comments_read" on public.short_comments for select to authenticated using (true);
create policy "short_comments_insert" on public.short_comments for insert to authenticated with check (user_id = auth.uid());
create policy "short_comments_delete" on public.short_comments for delete to authenticated using (user_id = auth.uid());

-- 5) Live comments (optional)
alter publication supabase_realtime add table public.short_comments;

-- 6) Live notifications for likes on shorts and new messages (run once; ignore "already member" errors)
alter publication supabase_realtime add table public.short_likes;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.private_call_sessions;
alter publication supabase_realtime add table public.private_call_ice;
