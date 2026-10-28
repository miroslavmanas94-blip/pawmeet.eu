alter table public.posts alter column post_type set default 'post';
comment on column public.posts.post_type is 'Content format: post or reel. Defaults to post for older clients and existing insert flows.';
