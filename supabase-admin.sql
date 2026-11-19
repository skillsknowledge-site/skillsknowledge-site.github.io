-- Run this ONCE after supabase-profiles.sql: Supabase > SQL Editor > New query > paste all > Run.
-- Adds: phone, roles, blocking, admin list, login by username/phone, and admin-only controls.

alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists role text not null default 'member';
alter table public.profiles add column if not exists blocked boolean not null default false;
alter table public.profiles add column if not exists last_seen timestamptz;
alter table public.profiles add column if not exists username_changed_at timestamptz;
alter table public.profiles drop constraint if exists role_values;
alter table public.profiles add constraint role_values check (role in ('member','trusted','editor'));
create unique index if not exists profiles_phone_key on public.profiles (phone) where phone is not null and phone <> '';

create table if not exists public.admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.admins enable row level security;   -- no policies: only the functions below can read it

create or replace function public.is_admin() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
grant execute on function public.is_admin() to authenticated;

-- a normal user can never change their own role or blocked flag
create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role; new.blocked := old.blocked; new.username_changed_at := old.username_changed_at;
  end if;
  return new;
end $$;
drop trigger if exists protect_profile_cols on public.profiles;
create trigger protect_profile_cols before update on public.profiles for each row execute function public.protect_profile();

-- a username can be changed only once every 10 days (the first pick does not count)
create or replace function public.username_cooldown() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.username is distinct from old.username and old.username is not null then
    if auth.uid() is not null and not public.is_admin() and old.username_changed_at is not null
       and old.username_changed_at > now() - interval '10 days' then
      raise exception 'You can change your username again on %.', to_char(old.username_changed_at + interval '10 days', 'FMDD Mon YYYY');
    end if;
    new.username_changed_at := now();
  end if;
  return new;
end $$;
drop trigger if exists username_cooldown_trg on public.profiles;
create trigger username_cooldown_trg before update on public.profiles for each row execute function public.username_cooldown();

-- is this account blocked? (lets the site show a "terminated" message instead of a vague login error)
create or replace function public.account_status(identifier text) returns boolean
language sql security definer set search_path = public, auth stable as $$
  select coalesce(bool_or(p.blocked), false) from public.profiles p join auth.users u on u.id = p.id
  where lower(u.email) = lower(trim(identifier)) or lower(p.username) = lower(trim(identifier))
     or (p.phone is not null and p.phone = regexp_replace(trim(identifier), '[^0-9+]', '', 'g'));
$$;
grant execute on function public.account_status(text) to anon, authenticated;

-- log in with a username or phone number (returns the email for that account)
create or replace function public.login_email(identifier text) returns text
language sql security definer set search_path = public, auth stable as $$
  select u.email::text from public.profiles p join auth.users u on u.id = p.id
  where lower(p.username) = lower(trim(identifier))
     or (p.phone is not null and p.phone = regexp_replace(trim(identifier), '[^0-9+]', '', 'g'))
  limit 1;
$$;
grant execute on function public.login_email(text) to anon, authenticated;

-- admin: list every user
drop function if exists public.admin_list_users();
create or replace function public.admin_list_users()
returns table (id uuid, email text, username text, display_name text, phone text, bio text, website text, location text,
               role text, blocked boolean, created_at timestamptz, last_sign_in_at timestamptz, provider text, is_admin boolean, last_seen timestamptz)
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query
    select p.id, u.email::text, p.username, p.display_name, p.phone, p.bio, p.website, p.location,
           p.role, p.blocked, u.created_at, u.last_sign_in_at, coalesce(u.raw_app_meta_data->>'provider','')::text,
           exists (select 1 from public.admins a where a.user_id = p.id), p.last_seen
    from public.profiles p join auth.users u on u.id = p.id
    order by u.created_at desc;
end $$;

-- admin: block or unblock (a blocked person cannot log in or refresh their session)
create or replace function public.admin_set_blocked(uid uuid, flag boolean) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  if uid = auth.uid() then raise exception 'You cannot block yourself.'; end if;
  update public.profiles set blocked = flag, updated_at = now() where id = uid;
  update auth.users set banned_until = case when flag then now() + interval '100 years' else null end where id = uid;
end $$;

-- admin: change what a person can access
create or replace function public.admin_set_role(uid uuid, new_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  update public.profiles set role = new_role, updated_at = now() where id = uid;
end $$;

-- admin: make or remove another admin
create or replace function public.admin_set_admin(uid uuid, flag boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  if uid = auth.uid() and not flag then raise exception 'You cannot remove yourself.'; end if;
  if flag then insert into public.admins (user_id) values (uid) on conflict do nothing;
  else delete from public.admins where user_id = uid; end if;
end $$;

revoke all on function public.admin_list_users() from public, anon;
revoke all on function public.admin_set_blocked(uuid, boolean) from public, anon;
revoke all on function public.admin_set_role(uuid, text) from public, anon;
revoke all on function public.admin_set_admin(uuid, boolean) from public, anon;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_set_blocked(uuid, boolean) to authenticated;
grant execute on function public.admin_set_role(uuid, text) to authenticated;
grant execute on function public.admin_set_admin(uuid, boolean) to authenticated;

-- make YOUR account the first admin. Change the email if this is not the one you log in with.
insert into public.admins (user_id)
select id from auth.users where email = 'skillsknowledge.site@gmail.com'
on conflict do nothing;

-- repair: accounts blocked earlier used a value Supabase cannot read ('infinity'). Give them a real far-future date.
update auth.users set banned_until = now() + interval '100 years' where banned_until = 'infinity'::timestamptz;

-- ===== appeals: a blocked person can send a message; you read it in the admin Users tab =====
create table if not exists public.appeals (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(message) between 5 and 1000),
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now()
);
alter table public.appeals enable row level security;   -- no policies: only the functions below can use it

create or replace function public.submit_appeal(identifier text, message text) returns text
language plpgsql security definer set search_path = public, auth as $$
declare uid uuid;
begin
  select p.id into uid from public.profiles p join auth.users u on u.id = p.id
  where p.blocked and (lower(u.email) = lower(trim(identifier)) or lower(p.username) = lower(trim(identifier))
        or (p.phone is not null and p.phone = regexp_replace(trim(identifier), '[^0-9+]', '', 'g')))
  limit 1;
  if uid is null then return 'notblocked'; end if;
  if char_length(trim(message)) < 5 then return 'short'; end if;
  if exists (select 1 from public.appeals a where a.user_id = uid and a.status = 'open' and a.created_at > now() - interval '1 day') then return 'wait'; end if;
  insert into public.appeals (user_id, message) values (uid, left(trim(message), 1000));
  return 'ok';
end $$;
grant execute on function public.submit_appeal(text, text) to anon, authenticated;

drop function if exists public.admin_list_appeals();
create or replace function public.admin_list_appeals()
returns table (id bigint, user_id uuid, email text, username text, display_name text, message text, status text, created_at timestamptz)
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query
    select a.id, a.user_id, u.email::text, p.username, p.display_name, a.message, a.status, a.created_at
    from public.appeals a join auth.users u on u.id = a.user_id left join public.profiles p on p.id = a.user_id
    order by (a.status = 'open') desc, a.created_at desc limit 100;
end $$;

create or replace function public.admin_close_appeal(aid bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  update public.appeals set status = 'closed' where id = aid;
end $$;
revoke all on function public.admin_list_appeals() from public, anon;
revoke all on function public.admin_close_appeal(bigint) from public, anon;
grant execute on function public.admin_list_appeals() to authenticated;
grant execute on function public.admin_close_appeal(bigint) to authenticated;

-- ===== sign-up with username + phone =====
create or replace function public.username_available(name text) returns boolean
language sql security definer set search_path = public stable as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(trim(name)));
$$;
grant execute on function public.username_available(text) to anon, authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare un text := nullif(trim(new.raw_user_meta_data->>'username'),''); ph text := nullif(regexp_replace(coalesce(new.raw_user_meta_data->>'phone',''),'[^0-9+]','','g'),'');
begin
  begin
    insert into public.profiles (id, display_name, username, phone)
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), un, ph)
    on conflict do nothing;
  exception when unique_violation then
    insert into public.profiles (id, display_name)
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)))
    on conflict do nothing;
  end;
  return new;
end $$;

-- ===== orders (checkout structure; no card data is ever stored) =====
create table if not exists public.orders (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  item text not null, plan text not null, amount integer not null,
  name text not null, email text not null, phone text, note text,
  method text not null, reference text,
  status text not null default 'pending' check (status in ('pending','paid','cancelled')),
  created_at timestamptz not null default now()
);
alter table public.orders enable row level security;
drop policy if exists orders_own on public.orders;
create policy orders_own on public.orders for select to authenticated using (user_id = auth.uid());

create or replace function public.create_order(p_item text, p_plan text, p_amount integer, p_name text, p_email text, p_phone text, p_note text, p_method text, p_reference text)
returns bigint language plpgsql security definer set search_path = public as $$
declare oid bigint;
begin
  if coalesce(trim(p_name),'') = '' or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Name and a valid email are required'; end if;
  if p_method not in ('card','jazzcash','easypaisa','bank','cod') then raise exception 'Unknown payment method'; end if;
  insert into public.orders(user_id,item,plan,amount,name,email,phone,note,method,reference)
  values (auth.uid(), left(p_item,40), left(p_plan,40), greatest(p_amount,0), left(trim(p_name),80), left(trim(p_email),120), left(p_phone,30), left(p_note,500), p_method, left(p_reference,80))
  returning id into oid;
  return oid;
end $$;
grant execute on function public.create_order(text,text,integer,text,text,text,text,text,text) to anon, authenticated;

create or replace function public.admin_list_orders() returns setof public.orders
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  return query select * from public.orders order by created_at desc limit 300;
end $$;
grant execute on function public.admin_list_orders() to authenticated;

create or replace function public.admin_set_order(p_id bigint, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  if p_status not in ('pending','paid','cancelled') then raise exception 'Bad status'; end if;
  update public.orders set status = p_status where id = p_id;
end $$;
grant execute on function public.admin_set_order(bigint,text) to authenticated;

-- ===== site analytics (visits, time on site) =====
create table if not exists public.visits (
  id bigint generated always as identity primary key,
  sid text not null, vid text not null, page text not null,
  seconds integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists visits_created_idx on public.visits (created_at);
create index if not exists visits_sid_idx on public.visits (sid);
alter table public.visits enable row level security;

create or replace function public.track_visit(p_sid text, p_vid text, p_page text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(p_sid,'')='' or coalesce(p_vid,'')='' then return; end if;
  insert into public.visits(sid,vid,page) values (left(p_sid,40), left(p_vid,40), left(p_page,60));
end $$;
grant execute on function public.track_visit(text,text,text) to anon, authenticated;

create or replace function public.track_time(p_sid text, p_page text, p_seconds integer) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.visits set seconds = least(greatest(p_seconds,0), 7200)
   where id = (select id from public.visits where sid = left(p_sid,40) and page = left(p_page,60) order by id desc limit 1);
end $$;
grant execute on function public.track_time(text,text,integer) to anon, authenticated;

create or replace function public.admin_analytics(p_days integer default 30) returns json
language plpgsql security definer set search_path = public as $$
declare d integer := least(greatest(coalesce(p_days,30),1),365); t0 timestamptz := now() - make_interval(days => d); t1 timestamptz := now() - make_interval(days => 2*d); r json;
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  select json_build_object(
    'sessions',(select count(distinct sid) from visits where created_at >= t0),
    'visitors',(select count(distinct vid) from visits where created_at >= t0),
    'avg_seconds',(select coalesce(round(avg(s)),0) from (select sum(seconds) s from visits where created_at >= t0 group by sid) x),
    'prev_sessions',(select count(distinct sid) from visits where created_at >= t1 and created_at < t0),
    'prev_visitors',(select count(distinct vid) from visits where created_at >= t1 and created_at < t0),
    'prev_avg_seconds',(select coalesce(round(avg(s)),0) from (select sum(seconds) s from visits where created_at >= t1 and created_at < t0 group by sid) x),
    'daily',(select coalesce(json_agg(json_build_object('day',to_char(g,'YYYY-MM-DD'),'sessions',coalesce(c,0)) order by g),'[]'::json)
             from generate_series(date_trunc('day',t0),date_trunc('day',now()),interval '1 day') g
             left join (select date_trunc('day',created_at) dd, count(distinct sid) c from visits where created_at >= t0 group by 1) v on v.dd = g),
    'pages',(select coalesce(json_agg(p),'[]'::json) from (select page, count(*) views, round(avg(nullif(seconds,0))) avg_seconds from visits where created_at >= t0 group by page order by count(*) desc limit 8) p)
  ) into r;
  return r;
end $$;
grant execute on function public.admin_analytics(integer) to authenticated;
