-- PawMeet security hardening and feature tables.
-- Non-destructive: no existing rows are deleted.
alter table public.posts
  add column if not exists status text not null default 'published',
  add column if not exists scheduled_at timestamptz,
  add column if not exists audience text not null default 'public';
alter table public.posts drop constraint if exists posts_status_check;
alter table public.posts add constraint posts_status_check check (status in ('draft','scheduled','published','archived'));
alter table public.posts drop constraint if exists posts_audience_check;
alter table public.posts add constraint posts_audience_check check (audience in ('public','followers','private'));
create index if not exists posts_scheduled_publish_idx on public.posts (scheduled_at) where status = 'scheduled';

drop policy if exists "Povolit vše přihlášeným u zpráv" on public.messages;
drop policy if exists "Allow public insert on posts" on public.posts;
drop policy if exists "Allow authenticated insert on posts" on public.posts;
drop policy if exists "Povolit vše přihlášeným u profilů" on public.profiles;
drop policy if exists "Allow public insert access" on public.comments;

drop policy if exists pawmeet_messages_select_participants on public.messages;
create policy pawmeet_messages_select_participants on public.messages for select to authenticated
using (
  (group_id is null and (sender_id = auth.uid() or receiver_id = auth.uid()))
  or (group_id is not null and exists (
    select 1 from public.group_members gm where gm.group_id = messages.group_id and gm.user_id = auth.uid()
  ))
);
drop policy if exists pawmeet_messages_insert_sender on public.messages;
create policy pawmeet_messages_insert_sender on public.messages for insert to authenticated
with check (
  sender_id = auth.uid() and (
    (group_id is null and receiver_id is not null and receiver_id <> auth.uid())
    or (group_id is not null and exists (
      select 1 from public.group_members gm where gm.group_id = messages.group_id and gm.user_id = auth.uid()
    ))
  )
);
drop policy if exists pawmeet_messages_update_recipient on public.messages;
create policy pawmeet_messages_update_recipient on public.messages for update to authenticated
using (receiver_id = auth.uid() and group_id is null)
with check (receiver_id = auth.uid() and group_id is null);
drop policy if exists pawmeet_messages_delete_sender on public.messages;
create policy pawmeet_messages_delete_sender on public.messages for delete to authenticated using (sender_id = auth.uid());

drop policy if exists pawmeet_posts_read_published_or_own on public.posts;
create policy pawmeet_posts_read_published_or_own on public.posts for select to anon, authenticated
using (
  user_id = auth.uid()
  or (status = 'published' and (
    audience = 'public'
    or (audience = 'followers' and auth.uid() is not null and exists (
      select 1 from public.followers f where f.follower_id = auth.uid() and f.following_id = posts.user_id
    ))
  ))
);
drop policy if exists "Příspěvky může číst každý" on public.posts;
drop policy if exists "Uživatelé mohou přidávat příspěvky" on public.posts;
create policy pawmeet_posts_insert_own on public.posts for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Uživatelé mohou mazat své příspěvky" on public.posts;
create policy pawmeet_posts_delete_own on public.posts for delete to authenticated using (user_id = auth.uid());
drop policy if exists pawmeet_posts_update_own on public.posts;
create policy pawmeet_posts_update_own on public.posts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Allow public read access" on public.comments;
create policy pawmeet_comments_read_public on public.comments for select to anon, authenticated using (true);
drop policy if exists pawmeet_comments_insert_own on public.comments;
create policy pawmeet_comments_insert_own on public.comments for insert to authenticated
with check (user_id = auth.uid() and user_id is not null);

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  question text not null check (length(trim(question)) between 1 and 300),
  closes_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  label text not null check (length(trim(label)) between 1 and 160),
  position smallint not null check (position between 1 and 6),
  unique (poll_id, position),
  unique (id, poll_id)
);
create table if not exists public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (poll_id, user_id),
  foreign key (option_id, poll_id) references public.poll_options(id, poll_id) on delete cascade
);
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;
drop policy if exists pawmeet_polls_read on public.polls;
create policy pawmeet_polls_read on public.polls for select to anon, authenticated using (true);
drop policy if exists pawmeet_polls_insert_own on public.polls;
create policy pawmeet_polls_insert_own on public.polls for insert to authenticated with check (creator_id = auth.uid());
drop policy if exists pawmeet_polls_update_own on public.polls;
create policy pawmeet_polls_update_own on public.polls for update to authenticated using (creator_id = auth.uid()) with check (creator_id = auth.uid());
drop policy if exists pawmeet_polls_delete_own on public.polls;
create policy pawmeet_polls_delete_own on public.polls for delete to authenticated using (creator_id = auth.uid());
drop policy if exists pawmeet_poll_options_read on public.poll_options;
create policy pawmeet_poll_options_read on public.poll_options for select to anon, authenticated using (true);
drop policy if exists pawmeet_poll_options_write on public.poll_options;
create policy pawmeet_poll_options_write on public.poll_options for all to authenticated
using (exists (select 1 from public.polls p where p.id = poll_id and p.creator_id = auth.uid()))
with check (exists (select 1 from public.polls p where p.id = poll_id and p.creator_id = auth.uid()));
drop policy if exists pawmeet_poll_votes_read on public.poll_votes;
create policy pawmeet_poll_votes_read on public.poll_votes for select to authenticated using (user_id = auth.uid());
drop policy if exists pawmeet_poll_votes_insert_own on public.poll_votes;
create policy pawmeet_poll_votes_insert_own on public.poll_votes for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (select 1 from public.polls p where p.id = poll_votes.poll_id and (p.closes_at is null or p.closes_at > now()))
  and exists (select 1 from public.poll_options o where o.id = poll_votes.option_id and o.poll_id = poll_votes.poll_id)
);
drop policy if exists pawmeet_poll_votes_delete_own on public.poll_votes;
create policy pawmeet_poll_votes_delete_own on public.poll_votes for delete to authenticated using (user_id = auth.uid());

create table if not exists public.licensed_audio_tracks (
  id uuid primary key default gen_random_uuid(),
  title text not null, artist text, provider text not null, provider_track_id text,
  license_name text not null, license_url text not null,
  permitted_use text not null default 'social_video', attribution text,
  preview_url text, track_url text not null, is_active boolean not null default true,
  created_at timestamptz not null default now(), unique (provider, provider_track_id)
);
alter table public.licensed_audio_tracks enable row level security;
drop policy if exists pawmeet_audio_catalog_read on public.licensed_audio_tracks;
create policy pawmeet_audio_catalog_read on public.licensed_audio_tracks for select to anon, authenticated using (is_active = true);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  course_id text, title text not null,
  certificate_type text not null check (certificate_type in ('course_completion','trainer_issued','admin_issued')),
  issued_by uuid references auth.users(id) on delete set null,
  score numeric(5,2) check (score is null or (score >= 0 and score <= 100)),
  issued_at timestamptz not null default now(), metadata jsonb not null default '{}'::jsonb
);
alter table public.certificates enable row level security;
drop policy if exists pawmeet_certificates_read on public.certificates;
create policy pawmeet_certificates_read on public.certificates for select to authenticated using (
  recipient_id = auth.uid() or exists (
    select 1 from public.profiles p where p.id = auth.uid()
      and lower(coalesce(p.role,'')) in ('admin','administrator','trainer','trenér')
  )
);
drop policy if exists pawmeet_certificates_insert_course on public.certificates;
drop policy if exists pawmeet_certificates_insert_staff on public.certificates;
create policy pawmeet_certificates_insert_staff on public.certificates for insert to authenticated with check (
  issued_by = auth.uid() and exists (
    select 1 from public.profiles p where p.id = auth.uid()
      and lower(coalesce(p.role,'')) in ('admin','administrator','trainer','trenér')
  )
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  trainer_id uuid not null references auth.users(id) on delete cascade,
  title text not null, description text, starts_at timestamptz not null, ends_at timestamptz,
  price_minor integer not null default 0 check (price_minor >= 0),
  currency text not null default 'CZK' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled','completed','payment_pending','paid','refunded')),
  payment_reference text, created_at timestamptz not null default now(),
  check (student_id <> trainer_id), check (ends_at is null or ends_at > starts_at)
);
create index if not exists reservations_trainer_start_idx on public.reservations(trainer_id, starts_at);
create index if not exists reservations_student_start_idx on public.reservations(student_id, starts_at);
alter table public.reservations enable row level security;
drop policy if exists pawmeet_reservations_read_participants on public.reservations;
create policy pawmeet_reservations_read_participants on public.reservations for select to authenticated
using (student_id = auth.uid() or trainer_id = auth.uid());
drop policy if exists pawmeet_reservations_create_student on public.reservations;
create policy pawmeet_reservations_create_student on public.reservations for insert to authenticated
with check (student_id = auth.uid() and status in ('pending','payment_pending'));
drop policy if exists pawmeet_reservations_update_participants on public.reservations;
create policy pawmeet_reservations_update_participants on public.reservations for update to authenticated
using (student_id = auth.uid() or trainer_id = auth.uid())
with check (student_id = auth.uid() or trainer_id = auth.uid());

create or replace function public.guard_pawmeet_reservation_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.student_id is distinct from old.student_id or new.trainer_id is distinct from old.trainer_id
     or new.price_minor is distinct from old.price_minor or new.currency is distinct from old.currency
     or new.starts_at is distinct from old.starts_at or new.ends_at is distinct from old.ends_at
     or new.payment_reference is distinct from old.payment_reference then
    raise exception 'Reservation identity, time, price and payment reference cannot be changed directly.';
  end if;
  if auth.uid() = old.student_id then
    if new.status not in ('cancelled') and new.status is distinct from old.status then
      raise exception 'Student can only cancel a reservation.';
    end if;
  elsif auth.uid() = old.trainer_id then
    if not ((old.status in ('pending','payment_pending','paid') and new.status in ('confirmed','cancelled'))
      or (old.status = 'confirmed' and new.status in ('completed','cancelled')) or new.status = old.status) then
      raise exception 'Invalid trainer reservation status transition.';
    end if;
  else
    raise exception 'Not a reservation participant.';
  end if;
  return new;
end;
$$;
drop trigger if exists pawmeet_reservation_update_guard on public.reservations;
create trigger pawmeet_reservation_update_guard before update on public.reservations
for each row execute function public.guard_pawmeet_reservation_update();

create or replace function public.publish_due_scheduled_posts()
returns integer language plpgsql security definer set search_path = public as $$
declare affected integer;
begin
  update public.posts set status = 'published', created_at = now()
  where status = 'scheduled' and scheduled_at is not null and scheduled_at <= now();
  get diagnostics affected = row_count;
  return affected;
end;
$$;
revoke all on function public.publish_due_scheduled_posts() from public, anon, authenticated;
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('pawmeet-publish-due-posts', '* * * * *', $$select public.publish_due_scheduled_posts();$$);
