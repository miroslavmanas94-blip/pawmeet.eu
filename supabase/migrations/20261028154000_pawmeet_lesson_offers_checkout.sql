-- Trainer-owned lesson offers and Stripe-backed paid reservations.
-- Existing reservation rows are preserved; offer_id remains nullable for legacy rows.
create table if not exists public.trainer_lesson_offers (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users(id) on delete cascade,
  title text not null check(length(trim(title)) between 1 and 180),
  description text,
  duration_minutes integer not null check(duration_minutes between 15 and 240),
  price_minor integer not null default 0 check(price_minor>=0),
  currency text not null default 'CZK' check(currency ~ '^[A-Z]{3}$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.reservations add column if not exists offer_id uuid references public.trainer_lesson_offers(id) on delete restrict;
alter table public.reservations add column if not exists stripe_checkout_session_id text;
alter table public.reservations add column if not exists checkout_expires_at timestamptz;
create index if not exists trainer_lesson_offers_active_idx on public.trainer_lesson_offers(is_active,trainer_id);
create index if not exists reservations_offer_id_idx on public.reservations(offer_id);
create unique index if not exists reservations_stripe_session_unique on public.reservations(stripe_checkout_session_id) where stripe_checkout_session_id is not null;
alter table public.trainer_lesson_offers enable row level security;
revoke all on public.trainer_lesson_offers from anon,authenticated;
grant select on public.trainer_lesson_offers to anon,authenticated;
grant insert,update,delete on public.trainer_lesson_offers to authenticated;
drop policy if exists pawmeet_trainer_offers_read on public.trainer_lesson_offers;
create policy pawmeet_trainer_offers_read on public.trainer_lesson_offers for select to anon,authenticated using (
 is_active or trainer_id=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and lower(coalesce(p.role,'')) in ('admin','administrator'))
);
drop policy if exists pawmeet_trainer_offers_insert_own on public.trainer_lesson_offers;
create policy pawmeet_trainer_offers_insert_own on public.trainer_lesson_offers for insert to authenticated with check (
 trainer_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and lower(coalesce(p.role,'')) in ('trainer','trenér','trainer_verified','trenér ověřený','admin','administrator'))
);
drop policy if exists pawmeet_trainer_offers_update_own on public.trainer_lesson_offers;
create policy pawmeet_trainer_offers_update_own on public.trainer_lesson_offers for update to authenticated using (
 trainer_id=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and lower(coalesce(p.role,'')) in ('admin','administrator'))
) with check (
 trainer_id=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and lower(coalesce(p.role,'')) in ('admin','administrator'))
);
drop policy if exists pawmeet_trainer_offers_delete_own on public.trainer_lesson_offers;
create policy pawmeet_trainer_offers_delete_own on public.trainer_lesson_offers for delete to authenticated using (
 trainer_id=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and lower(coalesce(p.role,'')) in ('admin','administrator'))
);

create or replace function public.guard_pawmeet_trainer_offer()
returns trigger language plpgsql set search_path=public as $$
declare current_role text;
begin
 select lower(coalesce(role,'')) into current_role from public.profiles where id=new.trainer_id;
 if current_user not in ('postgres','service_role') and current_role not in ('trainer','trenér','trainer_verified','trenér ověřený','admin','administrator') then raise exception 'Only approved trainers can manage lesson offers.'; end if;
 if tg_op='UPDATE' and new.trainer_id is distinct from old.trainer_id and current_user not in ('postgres','service_role') then raise exception 'Offer ownership cannot be changed.'; end if;
 return new;
end;
$$;
drop trigger if exists pawmeet_trainer_offer_guard on public.trainer_lesson_offers;
create trigger pawmeet_trainer_offer_guard before insert or update on public.trainer_lesson_offers for each row execute function public.guard_pawmeet_trainer_offer();
revoke all on function public.guard_pawmeet_trainer_offer() from public,anon,authenticated;

create or replace function public.guard_pawmeet_reservation_update()
returns trigger language plpgsql set search_path=public as $$
declare trainer_role text; offer_row public.trainer_lesson_offers%rowtype;
begin
 if current_user in ('postgres','service_role') and tg_op='UPDATE' then return new; end if;
 if tg_op='INSERT' then
  if new.offer_id is null then raise exception 'A lesson offer must be selected.'; end if;
  select * into offer_row from public.trainer_lesson_offers where id=new.offer_id and is_active;
  if not found or offer_row.trainer_id is distinct from new.trainer_id or offer_row.price_minor is distinct from new.price_minor or offer_row.currency is distinct from new.currency or offer_row.title is distinct from new.title or (new.ends_at is not null and extract(epoch from (new.ends_at-new.starts_at))/60 <> offer_row.duration_minutes) then raise exception 'Reservation does not match the selected active lesson offer.'; end if;
  select lower(coalesce(role,'')) into trainer_role from public.profiles where id=new.trainer_id;
  if trainer_role not in ('trainer','trenér','trainer_verified','trenér ověřený','admin','administrator') then raise exception 'Selected account is not an approved trainer.'; end if;
  if new.price_minor>0 and new.status<>'payment_pending' then raise exception 'Paid lessons must start as payment pending.'; end if;
  if new.price_minor=0 and new.status<>'pending' then raise exception 'Free lessons must start pending trainer confirmation.'; end if;
  return new;
 end if;
 if new.student_id is distinct from old.student_id or new.trainer_id is distinct from old.trainer_id or new.offer_id is distinct from old.offer_id or new.price_minor is distinct from old.price_minor or new.currency is distinct from old.currency or new.title is distinct from old.title or new.starts_at is distinct from old.starts_at or new.ends_at is distinct from old.ends_at or new.payment_reference is distinct from old.payment_reference or new.stripe_checkout_session_id is distinct from old.stripe_checkout_session_id or new.checkout_expires_at is distinct from old.checkout_expires_at then raise exception 'Reservation identity, time, price and payment data cannot be changed directly.'; end if;
 if auth.uid()=old.student_id then
  if new.status not in ('cancelled') and new.status is distinct from old.status then raise exception 'Student can only cancel a reservation.'; end if;
 elsif auth.uid()=old.trainer_id then
  if not ((old.status in ('pending','payment_pending','paid') and new.status in ('confirmed','cancelled')) or (old.status='confirmed' and new.status in ('completed','cancelled')) or new.status=old.status) then raise exception 'Invalid trainer reservation status transition.'; end if;
 else raise exception 'Not a reservation participant.';
 end if;
 return new;
end;
$$;
drop trigger if exists pawmeet_reservation_update_guard on public.reservations;
create trigger pawmeet_reservation_update_guard before insert or update on public.reservations for each row execute function public.guard_pawmeet_reservation_update();
revoke all on function public.guard_pawmeet_reservation_update() from public,anon,authenticated;
