-- Security hardening for PawMeet feature tables and scheduled publishing.
-- Non-destructive: no existing rows are deleted.
revoke all on table public.polls, public.poll_options, public.poll_votes, public.licensed_audio_tracks, public.certificates, public.reservations from anon, authenticated;
grant select on public.polls, public.poll_options to anon, authenticated;
grant select on public.licensed_audio_tracks to anon, authenticated;
grant select, insert, update, delete on public.polls, public.poll_options to authenticated;
grant select, insert, delete on public.poll_votes to authenticated;
grant select, insert, update on public.reservations to authenticated;
grant select, insert on public.certificates to authenticated;

create or replace function public.prevent_client_role_escalation()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.role is distinct from old.role and current_user not in ('postgres', 'service_role') then
    raise exception 'Role changes must be performed by a trusted administrative backend.';
  end if;
  return new;
end;
$$;
drop trigger if exists pawmeet_prevent_role_escalation on public.profiles;
create trigger pawmeet_prevent_role_escalation before update of role on public.profiles
for each row execute function public.prevent_client_role_escalation();
revoke all on function public.prevent_client_role_escalation() from public, anon, authenticated;

create or replace function public.guard_pawmeet_reservation_update()
returns trigger language plpgsql set search_path = public as $$
declare trainer_role text;
begin
  if tg_op = 'INSERT' then
    select lower(coalesce(role,'')) into trainer_role from public.profiles where id = new.trainer_id;
    if trainer_role not in ('trainer','trenér','trainer_verified','trenér ověřený') then
      raise exception 'Selected account is not an approved trainer.';
    end if;
    return new;
  end if;
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
create trigger pawmeet_reservation_update_guard before insert or update on public.reservations
for each row execute function public.guard_pawmeet_reservation_update();

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create or replace function private.publish_due_scheduled_posts()
returns integer language plpgsql security definer set search_path = public, private as $$
declare affected integer;
begin
  update public.posts set status = 'published', created_at = now()
  where status = 'scheduled' and scheduled_at is not null and scheduled_at <= now();
  get diagnostics affected = row_count;
  return affected;
end;
$$;
revoke all on function private.publish_due_scheduled_posts() from public, anon, authenticated;
do $$
declare existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname = 'pawmeet-publish-due-posts' limit 1;
  if existing_job is not null then perform cron.unschedule(existing_job); end if;
  perform cron.schedule('pawmeet-publish-due-posts', '* * * * *', 'select private.publish_due_scheduled_posts();');
end $$;

create or replace function public.get_poll_results(poll_uuid uuid)
returns table(option_id uuid, vote_count bigint, has_voted boolean)
language sql stable security definer set search_path = public as $$
  select o.id,
         count(v.id)::bigint,
         coalesce(bool_or(v.user_id = auth.uid()), false)
  from public.poll_options o
  left join public.poll_votes v on v.option_id = o.id and v.poll_id = o.poll_id
  where o.poll_id = poll_uuid
  group by o.id, o.position
  order by o.position
$$;
revoke all on function public.get_poll_results(uuid) from public, anon;
grant execute on function public.get_poll_results(uuid) to authenticated;

revoke all on table public.licensed_audio_tracks from anon, authenticated;
grant select on public.licensed_audio_tracks to anon, authenticated;
grant insert, update, delete on public.licensed_audio_tracks to authenticated;
drop policy if exists pawmeet_audio_catalog_read on public.licensed_audio_tracks;
create policy pawmeet_audio_catalog_read on public.licensed_audio_tracks for select to anon, authenticated using (is_active = true or exists (
  select 1 from public.profiles p where p.id = auth.uid() and lower(coalesce(p.role,'')) in ('admin','administrator')
));
drop policy if exists pawmeet_audio_catalog_insert_admin on public.licensed_audio_tracks;
create policy pawmeet_audio_catalog_insert_admin on public.licensed_audio_tracks for insert to authenticated with check (exists (
  select 1 from public.profiles p where p.id = auth.uid() and lower(coalesce(p.role,'')) in ('admin','administrator')
));
drop policy if exists pawmeet_audio_catalog_update_admin on public.licensed_audio_tracks;
create policy pawmeet_audio_catalog_update_admin on public.licensed_audio_tracks for update to authenticated using (exists (
  select 1 from public.profiles p where p.id = auth.uid() and lower(coalesce(p.role,'')) in ('admin','administrator')
)) with check (exists (
  select 1 from public.profiles p where p.id = auth.uid() and lower(coalesce(p.role,'')) in ('admin','administrator')
));
drop policy if exists pawmeet_audio_catalog_delete_admin on public.licensed_audio_tracks;
create policy pawmeet_audio_catalog_delete_admin on public.licensed_audio_tracks for delete to authenticated using (exists (
  select 1 from public.profiles p where p.id = auth.uid() and lower(coalesce(p.role,'')) in ('admin','administrator')
));
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'licensed_audio_https_urls') then
    alter table public.licensed_audio_tracks add constraint licensed_audio_https_urls
      check (license_url ~ '^https://' and track_url ~ '^https://' and (preview_url is null or preview_url ~ '^https://'));
  end if;
end $$;

revoke insert, update, delete on public.polls, public.poll_options from authenticated;
grant select on public.polls, public.poll_options to authenticated;
create or replace function public.create_poll(question_text text, option_labels text[], close_time timestamptz default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare created_poll_id uuid; option_label text; option_position smallint := 0;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  if question_text is null or length(trim(question_text)) < 1 or length(trim(question_text)) > 300 then raise exception 'Question must contain 1 to 300 characters.'; end if;
  if option_labels is null or array_length(option_labels, 1) is null or array_length(option_labels, 1) < 2 or array_length(option_labels, 1) > 6 then raise exception 'A poll must have 2 to 6 options.'; end if;
  if close_time is not null and close_time <= now() then raise exception 'Close time must be in the future.'; end if;
  if exists (select 1 from unnest(option_labels) x where x is null or length(trim(x)) < 1 or length(trim(x)) > 160) then raise exception 'Each option must contain 1 to 160 characters.'; end if;
  if (select count(distinct lower(trim(x))) from unnest(option_labels) x) <> array_length(option_labels,1) then raise exception 'Poll options must be unique.'; end if;
  insert into public.polls (creator_id, question, closes_at) values (auth.uid(), trim(question_text), close_time) returning id into created_poll_id;
  foreach option_label in array option_labels loop
    option_position := option_position + 1;
    insert into public.poll_options (poll_id, label, position) values (created_poll_id, trim(option_label), option_position);
  end loop;
  return created_poll_id;
end;
$$;
revoke all on function public.create_poll(text, text[], timestamptz) from public, anon;
grant execute on function public.create_poll(text, text[], timestamptz) to authenticated;

-- Lock down trigger-only privileged functions from direct API execution.
alter function public.handle_new_follow_notification() set search_path = public;
alter function public.handle_new_like_notification() set search_path = public;
alter function public.handle_new_comment_notification() set search_path = public;
revoke all on function public.handle_new_follow_notification() from public, anon, authenticated;
revoke all on function public.handle_new_like_notification() from public, anon, authenticated;
revoke all on function public.handle_new_comment_notification() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.notify_event_owner_on_join() from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
revoke all on function public.guard_pawmeet_reservation_update() from public, anon, authenticated;
drop function if exists public.publish_due_scheduled_posts();
