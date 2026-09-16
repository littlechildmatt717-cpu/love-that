-- Restrict the internal short-video moderation queue helper.
-- It is invoked by database triggers, not directly by API clients.
revoke execute on function public.queue_short_video_moderation() from public, anon, authenticated;
