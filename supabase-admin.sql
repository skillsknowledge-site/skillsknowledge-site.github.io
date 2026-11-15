-- Run this ONCE after supabase-profiles.sql: Supabase > SQL Editor > New query > paste all > Run.
-- Adds: phone, roles, blocking, admin list, login by username/phone, and admin-only controls.

alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists role text not null default 'member';
alter table public.profiles add column if not exists blocked boolean not null default false;
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
    new.role := old.role; new.blocked := old.blocked;
  end if;
  return new;
end $$;
drop trigger if exists protect_profile_cols on public.profiles;
create trigger protect_profile_cols before update on public.profiles for each row execute function public.protect_profile();

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
create or replace function public.admin_list_users()
returns table (id uuid, email text, username text, display_name text, phone text, bio text, website text, location text,
               role text, blocked boolean, created_at timestamptz, last_sign_in_at timestamptz, provider text, is_admin boolean)
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query
    select p.id, u.email::text, p.username, p.display_name, p.phone, p.bio, p.website, p.location,
           p.role, p.blocked, u.created_at, u.last_sign_in_at, coalesce(u.raw_app_meta_data->>'provider','')::text,
           exists (select 1 from public.admins a where a.user_id = p.id)
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
  update auth.users set banned_until = case when flag then 'infinity'::timestamptz else null end where id = uid;
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
