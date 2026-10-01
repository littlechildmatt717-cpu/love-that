create or replace function public.like_user(p_to_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_a uuid;
  v_b uuid;
  v_match_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_to_user_id is null or p_to_user_id = v_user_id then
    raise exception 'Invalid target';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = p_to_user_id
      and is_active = true
      and moderation_status not in ('suspended','banned')
  ) then
    raise exception 'Profile unavailable';
  end if;

  if exists (
    select 1 from public.blocks
    where (blocker_id = v_user_id and blocked_id = p_to_user_id)
       or (blocker_id = p_to_user_id and blocked_id = v_user_id)
  ) then
    raise exception 'Blocked';
  end if;

  insert into public.likes(from_user_id, to_user_id)
  values (v_user_id, p_to_user_id)
  on conflict (from_user_id, to_user_id) do nothing;

  if exists (
    select 1 from public.likes
    where from_user_id = p_to_user_id
      and to_user_id = v_user_id
  ) then
    v_a := least(v_user_id, p_to_user_id);
    v_b := greatest(v_user_id, p_to_user_id);

    insert into public.matches(user_a, user_b)
    values (v_a, v_b)
    on conflict (user_a, user_b) do nothing
    returning id into v_match_id;

    if v_match_id is null then
      select id into v_match_id
      from public.matches
      where user_a = v_a and user_b = v_b
      limit 1;
    end if;

    return jsonb_build_object(
      'ok', true,
      'match', jsonb_build_object('id', v_match_id, 'user_a', v_a, 'user_b', v_b)
    );
  end if;

  return jsonb_build_object('ok', true, 'match', null);
end;
$$;

grant execute on function public.like_user(uuid) to authenticated;

create policy "profile photos authenticated read"
on storage.objects
for select
to authenticated
using (bucket_id = 'profile-photos');
