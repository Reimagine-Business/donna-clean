create extension if not exists "pgcrypto";

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_type text not null check (entry_type in ('Cash Inflow', 'Cash Outflow', 'Credit', 'Advance')),
  category text not null check (category in ('Sales', 'COGS', 'Opex', 'Assets')),
  payment_method text not null default 'Cash' check (payment_method in ('Cash', 'Bank', 'UPI', 'Card', 'Cheque', 'Other')),
  amount numeric(14,2) not null check (amount >= 0),
  entry_date date not null default current_date,
  notes text,
  image_url text,
  settled boolean not null default false,
  settled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_entries_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_entries_updated_at on public.entries;
create trigger set_entries_updated_at
before update on public.entries
for each row execute function public.set_entries_updated_at();

alter table public.entries enable row level security;

drop policy if exists "Users can insert their own entries" on public.entries;
drop policy if exists "Users can view their own entries" on public.entries;
drop policy if exists "Users can update their own entries" on public.entries;
drop policy if exists "Users can delete their own entries" on public.entries;

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
