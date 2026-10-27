-- Allow users to reapply after a request is reviewed; only one pending request per role.
alter table public.role_requests drop constraint if exists role_requests_user_id_requested_role_status_key;
create unique index if not exists role_requests_one_pending_idx on public.role_requests(user_id, requested_role) where status='pending';
