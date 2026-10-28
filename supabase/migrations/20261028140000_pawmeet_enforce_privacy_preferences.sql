-- Enforce stored profile and story visibility preferences without deleting data.
alter table public.profiles add column if not exists visibility text not null default 'public';
alter table public.stories add column if not exists audience text not null default 'public';
alter table public.profiles drop constraint if exists profiles_visibility_check;
alter table public.profiles add constraint profiles_visibility_check check (visibility in ('public','members','private'));
alter table public.stories drop constraint if exists stories_audience_check;
alter table public.stories add constraint stories_audience_check check (audience in ('public','followers','private'));

drop policy if exists "Povolit veřejné čtení profilů" on public.profiles;
drop policy if exists "Profily jsou veřejně čitelné" on public.profiles;
drop policy if exists "Profily jsou čitelné pro všechny" on public.profiles;
drop policy if exists pawmeet_profiles_read_by_visibility on public.profiles;
create policy pawmeet_profiles_read_by_visibility on public.profiles for select to anon, authenticated
using (id = auth.uid() or visibility = 'public' or (visibility = 'members' and auth.uid() is not null));

drop policy if exists "Příběhy jsou veřejné" on public.stories;
drop policy if exists "Veřejné čtení příběhů" on public.stories;
drop policy if exists pawmeet_stories_read_by_audience on public.stories;
create policy pawmeet_stories_read_by_audience on public.stories for select to anon, authenticated
using (
  user_id = auth.uid() or audience = 'public'
  or (audience = 'followers' and auth.uid() is not null and exists (
    select 1 from public.followers f where f.follower_id = auth.uid() and f.following_id = stories.user_id
  ))
);
