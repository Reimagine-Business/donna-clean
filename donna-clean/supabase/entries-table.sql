-- Enable pgcrypto for gen_random_uuid if it hasn't been enabled already
create extension if not exists "pgcrypto";

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.entries enable row level security;

create policy "Users can insert their own entries"
  on public.entries
  for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own entries"
  on public.entries
  for select
  using (auth.uid() = user_id);

create policy "Users can update their own entries"
  on public.entries
  for update
  using (auth.uid() = user_id);

create policy "Users can delete their own entries"
  on public.entries
  for delete
  using (auth.uid() = user_id);
