alter table public.profiles add column if not exists date_night_enabled boolean not null default false;

create table if not exists public.date_night_likes (
  from_user uuid not null references public.profiles(id) on delete cascade,
  to_user uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_user,to_user),
  check (from_user <> to_user)
);

create table if not exists public.date_night_availability (
  user_id uuid not null references public.profiles(id) on delete cascade,
  date_local date not null,
  created_at timestamptz not null default now(),
  primary key (user_id,date_local)
);

create table if not exists public.date_night_dates (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  date_local date not null,
  scheduled_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled','completed')),
  confirmed_a boolean not null default false,
  confirmed_b boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_a < user_b),
  unique(user_a,user_b,date_local)
);

create index if not exists date_night_profiles_idx on public.profiles(date_night_enabled,is_active,location);
create index if not exists date_night_likes_to_idx on public.date_night_likes(to_user);
create index if not exists date_night_availability_date_idx on public.date_night_availability(date_local,user_id);
create index if not exists date_night_dates_user_idx on public.date_night_dates(user_a,user_b,date_local);

alter table public.date_night_likes enable row level security;
alter table public.date_night_availability enable row level security;
alter table public.date_night_dates enable row level security;

create policy "date night likes own read" on public.date_night_likes for select to authenticated using(from_user=auth.uid() or to_user=auth.uid());
create policy "date night availability own read" on public.date_night_availability for select to authenticated using(user_id=auth.uid());
create policy "date night dates participants read" on public.date_night_dates for select to authenticated using(user_a=auth.uid() or user_b=auth.uid());

create or replace function public.date_night_swipe(p_to_user uuid,p_like boolean)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); mutual boolean:=false;
begin
 if uid is null then raise exception 'Not authenticated'; end if;
 if p_to_user is null or p_to_user=uid then raise exception 'Invalid profile'; end if;
 if not exists(select 1 from public.profiles p where p.id=p_to_user and p.is_active and p.date_night_enabled) then raise exception 'Profile is not available for Date Night'; end if;
 if p_like then
   insert into public.date_night_likes(from_user,to_user) values(uid,p_to_user) on conflict(from_user,to_user) do nothing;
   mutual:=exists(select 1 from public.date_night_likes where from_user=p_to_user and to_user=uid);
 else
   delete from public.date_night_likes where from_user=uid and to_user=p_to_user;
 end if;
 return jsonb_build_object('ok',true,'mutual',mutual);
end; $$;
revoke all on function public.date_night_swipe(uuid,boolean) from public,anon;
grant execute on function public.date_night_swipe(uuid,boolean) to authenticated;

create or replace function public.date_night_set_availability(p_dates date[])
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); d date;
begin
 if uid is null then raise exception 'Not authenticated'; end if;
 delete from public.date_night_availability where user_id=uid and date_local>=current_date and date_local<current_date+45;
 if p_dates is not null then foreach d in array p_dates loop
   if d>=current_date and d<current_date+45 then insert into public.date_night_availability(user_id,date_local) values(uid,d) on conflict do nothing; end if;
 end loop; end if;
 return jsonb_build_object('ok',true);
end; $$;
revoke all on function public.date_night_set_availability(date[]) from public,anon;
grant execute on function public.date_night_set_availability(date[]) to authenticated;

create or replace function public.date_night_common_dates(p_partner uuid)
returns date[] language sql security definer set search_path=pg_catalog,public as $$
select coalesce(array_agg(a.date_local order by a.date_local),'{}'::date[])
from public.date_night_availability a
join public.date_night_availability b on b.date_local=a.date_local
where a.user_id=auth.uid() and b.user_id=p_partner and a.date_local>=current_date and a.date_local<current_date+45;
$$;
revoke all on function public.date_night_common_dates(uuid) from public,anon;
grant execute on function public.date_night_common_dates(uuid) to authenticated;

create or replace function public.date_night_confirm(p_partner uuid,p_date date)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); a uuid; b uuid; existing public.date_night_dates%rowtype; all_confirmed boolean:=false; sched timestamptz; confirmed_existing public.date_night_dates%rowtype;
begin
 if uid is null then raise exception 'Not authenticated'; end if;
 if p_partner is null or p_partner=uid then raise exception 'Invalid partner'; end if;
 a:=least(uid,p_partner); b:=greatest(uid,p_partner);
 if not exists(select 1 from public.date_night_likes where from_user=uid and to_user=p_partner) or not exists(select 1 from public.date_night_likes where from_user=p_partner and to_user=uid) then raise exception 'You need a mutual Date Night match first'; end if;
 if not exists(select 1 from public.date_night_availability where user_id=uid and date_local=p_date) or not exists(select 1 from public.date_night_availability where user_id=p_partner and date_local=p_date) then raise exception 'That date is not available for both people'; end if;
 select * into confirmed_existing from public.date_night_dates where user_a=a and user_b=b and status='confirmed' order by scheduled_at limit 1;
 if confirmed_existing.id is not null and confirmed_existing.date_local<>p_date then raise exception 'A Date Night is already confirmed for this match'; end if;
 update public.date_night_dates set status='cancelled',updated_at=now() where user_a=a and user_b=b and status='pending' and date_local<>p_date;
 select * into existing from public.date_night_dates where user_a=a and user_b=b and date_local=p_date limit 1;
 if existing.id is null then
   sched:=(p_date::text||' 20:00:00 Europe/London')::timestamptz;
   insert into public.date_night_dates(user_a,user_b,date_local,scheduled_at,confirmed_a,confirmed_b,status) values(a,b,p_date,sched,uid=a,uid=b,'pending') returning * into existing;
 else
   if uid=a then update public.date_night_dates set confirmed_a=true,updated_at=now() where id=existing.id returning * into existing;
   else update public.date_night_dates set confirmed_b=true,updated_at=now() where id=existing.id returning * into existing; end if;
 end if;
 all_confirmed:=existing.confirmed_a and existing.confirmed_b;
 if all_confirmed then update public.date_night_dates set status='confirmed',updated_at=now() where id=existing.id returning * into existing; end if;
 return jsonb_build_object('ok',true,'date_id',existing.id,'date_local',existing.date_local,'scheduled_at',existing.scheduled_at,'status',existing.status,'confirmed_a',existing.confirmed_a,'confirmed_b',existing.confirmed_b,'both_confirmed',all_confirmed);
end; $$;
revoke all on function public.date_night_confirm(uuid,date) from public,anon;
grant execute on function public.date_night_confirm(uuid,date) to authenticated;

create or replace function public.date_night_cancel(p_date_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Not authenticated'; end if;
 update public.date_night_dates set status='cancelled',updated_at=now() where id=p_date_id and(user_a=uid or user_b=uid) and status in('pending','confirmed');
 return jsonb_build_object('ok',true);
end; $$;
revoke all on function public.date_night_cancel(uuid) from public,anon;
grant execute on function public.date_night_cancel(uuid) to authenticated;
