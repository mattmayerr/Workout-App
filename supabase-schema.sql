create extension if not exists pgcrypto;

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  date date not null,
  routine_id text not null,
  routine_name text not null,
  duration integer,
  bodyweight numeric(6, 2),
  notes text,
  exercises jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workouts_user_date_idx on public.workouts (user_id, date desc);

alter table public.workouts enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.workouts to authenticated;

drop policy if exists "Users can view their own workouts" on public.workouts;
drop policy if exists "Users can insert their own workouts" on public.workouts;
drop policy if exists "Users can update their own workouts" on public.workouts;
drop policy if exists "Users can delete their own workouts" on public.workouts;

create policy "Users can view their own workouts"
  on public.workouts
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own workouts"
  on public.workouts
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own workouts"
  on public.workouts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own workouts"
  on public.workouts
  for delete
  using (auth.uid() = user_id);

create table if not exists public.routines (
  user_id uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  days jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.routines enable row level security;

grant select, insert, update, delete on public.routines to authenticated;

drop policy if exists "Users can view their own routine" on public.routines;
drop policy if exists "Users can insert their own routine" on public.routines;
drop policy if exists "Users can update their own routine" on public.routines;
drop policy if exists "Users can delete their own routine" on public.routines;

create policy "Users can view their own routine"
  on public.routines
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own routine"
  on public.routines
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own routine"
  on public.routines
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own routine"
  on public.routines
  for delete
  using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_workouts_updated_at on public.workouts;

create trigger set_workouts_updated_at
  before update on public.workouts
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_routines_updated_at on public.routines;

create trigger set_routines_updated_at
  before update on public.routines
  for each row
  execute function public.set_updated_at();
