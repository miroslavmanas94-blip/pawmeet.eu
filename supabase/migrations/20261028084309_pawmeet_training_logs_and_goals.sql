-- Additive PawMeet training journal and goals.
-- Existing application tables and their policies are not modified.
create table if not exists public.training_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid null references public.pets(id) on delete set null,
  activity_type text not null default 'Poslušnost' check (char_length(activity_type) <= 80),
  title text not null check (char_length(title) between 1 and 160),
  notes text not null default '' check (char_length(notes) <= 5000),
  duration_minutes integer not null default 10 check (duration_minutes between 1 and 600),
  mood_rating smallint check (mood_rating between 1 and 5),
  success_rating smallint check (success_rating between 1 and 5),
  difficulty text not null default 'běžná' check (difficulty in ('lehká','běžná','náročná')),
  next_reminder_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists training_logs_user_created_idx on public.training_logs (user_id, created_at desc);
create index if not exists training_logs_pet_created_idx on public.training_logs (pet_id, created_at desc);
alter table public.training_logs enable row level security;
drop policy if exists "Users can read own training logs" on public.training_logs;
create policy "Users can read own training logs" on public.training_logs for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can create own training logs" on public.training_logs;
create policy "Users can create own training logs" on public.training_logs for insert to authenticated with check (auth.uid() = user_id and (pet_id is null or exists (select 1 from public.pets p where p.id = pet_id and p.user_id = auth.uid())));
drop policy if exists "Users can update own training logs" on public.training_logs;
create policy "Users can update own training logs" on public.training_logs for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id and (pet_id is null or exists (select 1 from public.pets p where p.id = pet_id and p.user_id = auth.uid())));
drop policy if exists "Users can delete own training logs" on public.training_logs;
create policy "Users can delete own training logs" on public.training_logs for delete to authenticated using (auth.uid() = user_id);
grant select, insert, update, delete on public.training_logs to authenticated;

create table if not exists public.training_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid null references public.pets(id) on delete set null,
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '' check (char_length(description) <= 2000),
  target_date date,
  is_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists training_goals_user_created_idx on public.training_goals (user_id, created_at desc);
alter table public.training_goals enable row level security;
drop policy if exists "Users can read own training goals" on public.training_goals;
create policy "Users can read own training goals" on public.training_goals for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can create own training goals" on public.training_goals;
create policy "Users can create own training goals" on public.training_goals for insert to authenticated with check (auth.uid() = user_id and (pet_id is null or exists (select 1 from public.pets p where p.id = pet_id and p.user_id = auth.uid())));
drop policy if exists "Users can update own training goals" on public.training_goals;
create policy "Users can update own training goals" on public.training_goals for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id and (pet_id is null or exists (select 1 from public.pets p where p.id = pet_id and p.user_id = auth.uid())));
drop policy if exists "Users can delete own training goals" on public.training_goals;
create policy "Users can delete own training goals" on public.training_goals for delete to authenticated using (auth.uid() = user_id);
grant select, insert, update, delete on public.training_goals to authenticated;