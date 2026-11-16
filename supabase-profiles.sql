-- Run this once: Supabase > SQL Editor > New query > paste everything > Run.
-- It creates the "profiles" table (visible in Table Editor), unique usernames, and account deletion.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  display_name text,
  bio text,
  website text,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (username is null or username ~ '^[a-z0-9_.]{3,20}$'),
  constraint username_reserved check (username is null or username not in ('admin','administrator','root','support','owner','moderator','system','api','login','account','sk','skillsknowledge')),
  constraint bio_len check (bio is null or char_length(bio) <= 160)
);

-- one username can belong to only one person (not case sensitive)
create unique index if not exists profiles_username_key on public.profiles (lower(username)) where username is not null;

alter table public.profiles enable row level security;
drop policy if exists "read own profile" on public.profiles;
drop policy if exists "insert own profile" on public.profiles;
drop policy if exists "update own profile" on public.profiles;
create policy "read own profile"   on public.profiles for select to authenticated using (auth.uid() = id);
create policy "insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- every new sign-up gets a profile row automatically
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name)
  values (new.id, nullif(lower(new.raw_user_meta_data->>'username'), ''), coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)))
  on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- rows for people who already signed in before this script
insert into public.profiles (id, display_name)
select id, coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email,'@',1)) from auth.users
on conflict do nothing;

-- "is this username free?" check used by the website
create or replace function public.username_free(name text) returns boolean
language sql security definer set search_path = public stable as $$
  select not exists (select 1 from public.profiles where lower(username) = lower(name));
$$;
revoke all on function public.username_free(text) from public, anon;
grant execute on function public.username_free(text) to authenticated;

-- lets a signed-in person delete their own account
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
