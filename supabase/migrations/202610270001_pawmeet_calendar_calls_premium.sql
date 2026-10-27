-- PawMeet additions: calendar, event safety, push subscription storage and Premium entitlements.
-- Additive only: existing rows and policies are preserved.
alter table public.profiles
  add column if not exists role text not null default 'member',
  add column if not exists is_premium boolean not null default false,
  add column if not exists premium_status text not null default 'inactive',
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists premium_current_period_end timestamptz;

create index if not exists profiles_stripe_subscription_id_idx on public.profiles (stripe_subscription_id) where stripe_subscription_id is not null;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  description text not null default '' check (char_length(description) <= 5000),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text not null default '' check (char_length(location) <= 300),
  event_type text not null default 'meetup' check (event_type in ('meetup','training','competition','walk','online','other')),
  capacity integer check (capacity is null or capacity between 1 and 100000),
  is_online boolean not null default false,
  status text not null default 'published' check (status in ('published','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
create index if not exists events_starts_at_idx on public.events (starts_at) where status = 'published';
create index if not exists events_created_by_idx on public.events (created_by);

create table if not exists public.event_participants (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create table if not exists public.event_reports (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 1000),
  created_at timestamptz not null default now(),
  unique (event_id, reporter_id)
);
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.event_reports enable row level security;
alter table public.push_subscriptions enable row level security;

drop policy if exists "Published events are public" on public.events;
create policy "Published events are public" on public.events for select to anon, authenticated using (status = 'published');
drop policy if exists "Members create events" on public.events;
create policy "Members create events" on public.events for insert to authenticated with check (auth.uid() = created_by);
drop policy if exists "Owners update events" on public.events;
create policy "Owners update events" on public.events for update to authenticated using (auth.uid() = created_by) with check (auth.uid() = created_by);
drop policy if exists "Owners cancel events" on public.events;
create policy "Owners cancel events" on public.events for delete to authenticated using (auth.uid() = created_by);

drop policy if exists "Event attendance is visible to members" on public.event_participants;
create policy "Event attendance is visible to members" on public.event_participants for select to authenticated using (auth.uid() = user_id or exists (select 1 from public.events e where e.id = event_id and e.created_by = auth.uid()));
drop policy if exists "Members join events as themselves" on public.event_participants;
create policy "Members join events as themselves" on public.event_participants for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Members leave events as themselves" on public.event_participants;
create policy "Members leave events as themselves" on public.event_participants for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Members report events" on public.event_reports;
create policy "Members report events" on public.event_reports for insert to authenticated with check (auth.uid() = reporter_id);
drop policy if exists "Reporters read own reports" on public.event_reports;
create policy "Reporters read own reports" on public.event_reports for select to authenticated using (auth.uid() = reporter_id);

drop policy if exists "Users manage own push subscriptions" on public.push_subscriptions;
create policy "Users manage own push subscriptions" on public.push_subscriptions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
