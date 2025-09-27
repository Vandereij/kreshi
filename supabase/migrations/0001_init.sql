create extension if not exists "pgcrypto";

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  mood smallint check (mood between 1 and 5),
  tags text[] default '{}',
  cipher bytea not null,
  iv bytea not null,
  dek_wrapped bytea not null,
  dek_wrap_iv bytea,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.journal_entries enable row level security;
create policy if not exists "own journals all"
  on public.journal_entries for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_journal_entries_user_created on public.journal_entries (user_id, created_at desc);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy if not exists "profiles are self manageable"
  on public.profiles for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
