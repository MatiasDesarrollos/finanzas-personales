-- =============================================
-- App Familia - Database Schema
-- Run this in your Supabase SQL Editor
-- =============================================

-- 1. Profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Categories table
create table if not exists public.categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  icon text,
  created_at timestamptz default now()
);

alter table public.categories enable row level security;

create policy "Users can manage own categories"
  on public.categories for all
  using (auth.uid() = user_id);

-- 3. Transactions table
create table if not exists public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete set null,
  type text not null check (type in ('income', 'expense')),
  amount numeric not null check (amount > 0),
  currency text not null default 'ARS' check (currency in ('ARS', 'USD')),
  description text,
  date date not null,
  created_at timestamptz default now()
);

alter table public.transactions enable row level security;

create policy "Users can manage own transactions"
  on public.transactions for all
  using (auth.uid() = user_id);

-- 4. Savings goals table
create table if not exists public.savings_goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  target_amount numeric not null check (target_amount > 0),
  currency text not null default 'ARS' check (currency in ('ARS', 'USD')),
  deadline date,
  created_at timestamptz default now()
);

alter table public.savings_goals enable row level security;

create policy "Users can manage own savings goals"
  on public.savings_goals for all
  using (auth.uid() = user_id);

-- 5. Savings contributions table
create table if not exists public.savings_contributions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  goal_id uuid references public.savings_goals(id) on delete cascade not null,
  amount numeric not null check (amount > 0),
  currency text not null default 'ARS' check (currency in ('ARS', 'USD')),
  date date not null,
  created_at timestamptz default now()
);

alter table public.savings_contributions enable row level security;

create policy "Users can manage own contributions"
  on public.savings_contributions for all
  using (auth.uid() = user_id);

-- 6. Default categories seed (run after a user signs up, or insert manually)
-- These will be inserted per-user via the app on first login
