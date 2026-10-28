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
