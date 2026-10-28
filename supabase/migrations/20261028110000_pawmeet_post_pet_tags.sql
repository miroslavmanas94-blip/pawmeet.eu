alter table public.posts add column if not exists pet_tag text;
comment on column public.posts.pet_tag is 'Optional dog name or profile label attached to a post.';
