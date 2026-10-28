alter table public.posts
  add column if not exists alt_text text,
  add column if not exists post_type text not null default 'post';

alter table public.stories
  add column if not exists alt_text text;

comment on column public.posts.alt_text is 'Accessible description of the primary media for screen readers.';
comment on column public.posts.post_type is 'Content format: post or reel.';
comment on column public.stories.alt_text is 'Accessible description of story media for screen readers.';
