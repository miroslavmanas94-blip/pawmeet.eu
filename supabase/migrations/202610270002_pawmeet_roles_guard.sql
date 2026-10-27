-- Prevent client-side self-promotion and add trainer/organizer role requests.
create or replace function public.guard_pawmeet_privileged_profile_fields()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    if tg_op = 'INSERT' then
      if coalesce(new.role, 'member') <> 'member'
        or coalesce(new.is_premium, false) <> false
        or coalesce(new.premium_status, 'inactive') <> 'inactive'
        or new.stripe_customer_id is not null
        or new.stripe_subscription_id is not null
        or new.premium_current_period_end is not null then
        raise exception 'Privileged profile fields can only be assigned by trusted server code';
      end if;
    elsif new.role is distinct from old.role
      or new.is_premium is distinct from old.is_premium
      or new.premium_status is distinct from old.premium_status
      or new.stripe_customer_id is distinct from old.stripe_customer_id
      or new.stripe_subscription_id is distinct from old.stripe_subscription_id
      or new.premium_current_period_end is distinct from old.premium_current_period_end then
      raise exception 'Privileged profile fields can only be assigned by trusted server code';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists guard_pawmeet_privileged_profile_fields on public.profiles;
create trigger guard_pawmeet_privileged_profile_fields before insert or update on public.profiles for each row execute function public.guard_pawmeet_privileged_profile_fields();

create table if not exists public.role_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_role text not null check (requested_role in ('trainer','event_organizer')),
  message text not null default '' check (char_length(message) <= 2000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists role_requests_one_pending_idx on public.role_requests(user_id,requested_role) where status='pending';
alter table public.role_requests enable row level security;
drop policy if exists "Users submit their own role requests" on public.role_requests;
create policy "Users submit their own role requests" on public.role_requests for insert to authenticated with check (auth.uid()=user_id and status='pending' and reviewed_by is null and reviewed_at is null);
drop policy if exists "Users and admins read role requests" on public.role_requests;
create policy "Users and admins read role requests" on public.role_requests for select to authenticated using (auth.uid()=user_id or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
drop policy if exists "Admins review role requests" on public.role_requests;
create policy "Admins review role requests" on public.role_requests for update to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')) with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
