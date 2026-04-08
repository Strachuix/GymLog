-- GymLog / Supabase initial schema
-- Run this in the Supabase SQL editor before enabling cloud sync in the app.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    username text default 'GymLog User',
    gender text,
    age integer,
    height integer,
    weight numeric(6,2),
    one_rm_formula text default 'epley',
    profile_picture_base64 text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint profiles_gender_check check (gender in ('male', 'female') or gender is null)
);

create table if not exists public.training_sets (
    id uuid primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    exercise text not null,
    type text not null,
    weight numeric(8,2),
    reps integer,
    added_weight numeric(8,2),
    body_weight numeric(8,2),
    duration numeric(10,2),
    distance numeric(10,2),
    elevation numeric(10,2),
    timestamp bigint not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint training_sets_type_check check (type in ('weighted', 'bodyweight', 'timed'))
);

create table if not exists public.weight_history (
    id text primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    timestamp bigint not null,
    weight numeric(6,2) not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_training_sets_user_id on public.training_sets(user_id);
create index if not exists idx_training_sets_user_timestamp on public.training_sets(user_id, timestamp desc);
create index if not exists idx_weight_history_user_id on public.weight_history(user_id);
create index if not exists idx_weight_history_user_timestamp on public.weight_history(user_id, timestamp desc);

alter table public.profiles enable row level security;
alter table public.training_sets enable row level security;
alter table public.weight_history enable row level security;

create policy "Profiles are readable by owner"
on public.profiles
for select
using (auth.uid() = id);

create policy "Profiles are insertable by owner"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "Profiles are updatable by owner"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Training sets are readable by owner"
on public.training_sets
for select
using (auth.uid() = user_id);

create policy "Training sets are insertable by owner"
on public.training_sets
for insert
with check (auth.uid() = user_id);

create policy "Training sets are updatable by owner"
on public.training_sets
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Training sets are deletable by owner"
on public.training_sets
for delete
using (auth.uid() = user_id);

create policy "Weight history is readable by owner"
on public.weight_history
for select
using (auth.uid() = user_id);

create policy "Weight history is insertable by owner"
on public.weight_history
for insert
with check (auth.uid() = user_id);

create policy "Weight history is updatable by owner"
on public.weight_history
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Weight history is deletable by owner"
on public.weight_history
for delete
using (auth.uid() = user_id);
