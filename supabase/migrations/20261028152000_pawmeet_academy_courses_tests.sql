-- PawMeet Academy: published courses, private answer keys, server-scored tests and certificates.
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(), author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check(length(trim(title)) between 1 and 180),
  summary text not null check(length(trim(summary)) between 1 and 600),
  content text not null check(length(trim(content)) between 1 and 30000),
  level text not null default 'základní', category text not null default 'Výchova',
  is_published boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.course_questions (
  id uuid primary key default gen_random_uuid(), course_id uuid not null references public.courses(id) on delete cascade,
  prompt text not null check(length(trim(prompt)) between 1 and 800), position smallint not null check(position between 1 and 20), unique(course_id,position)
);
create table if not exists public.course_options (
  id uuid primary key default gen_random_uuid(), question_id uuid not null references public.course_questions(id) on delete cascade,
  label text not null check(length(trim(label)) between 1 and 300), position smallint not null check(position between 1 and 6),
  unique(question_id,position), unique(id,question_id)
);
create table if not exists public.course_answer_keys (
  question_id uuid primary key references public.course_questions(id) on delete cascade,
  correct_option_id uuid not null, foreign key(correct_option_id,question_id) references public.course_options(id,question_id) on delete cascade
);
create table if not exists public.course_attempts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  score numeric(5,2) not null check(score between 0 and 100), passed boolean not null,
  answers jsonb not null default '[]'::jsonb, completed_at timestamptz not null default now()
);
create index if not exists course_attempts_user_course_idx on public.course_attempts(user_id,course_id,completed_at desc);
alter table public.courses enable row level security;
alter table public.course_questions enable row level security;
alter table public.course_options enable row level security;
alter table public.course_answer_keys enable row level security;
alter table public.course_attempts enable row level security;
revoke all on public.courses,public.course_questions,public.course_options,public.course_answer_keys,public.course_attempts from anon,authenticated;
grant select on public.courses,public.course_questions,public.course_options to anon,authenticated;
grant select on public.course_attempts to authenticated;
drop policy if exists pawmeet_courses_read on public.courses;
create policy pawmeet_courses_read on public.courses for select to anon,authenticated using (
 is_published or author_id=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and lower(coalesce(p.role,'')) in ('admin','administrator','trainer','trenér'))
);
drop policy if exists pawmeet_course_questions_read on public.course_questions;
create policy pawmeet_course_questions_read on public.course_questions for select to anon,authenticated using (
 exists(select 1 from public.courses c where c.id=course_id and (c.is_published or c.author_id=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and lower(coalesce(p.role,'')) in ('admin','administrator','trainer','trenér'))))
);
drop policy if exists pawmeet_course_options_read on public.course_options;
create policy pawmeet_course_options_read on public.course_options for select to anon,authenticated using (
 exists(select 1 from public.course_questions q join public.courses c on c.id=q.course_id where q.id=question_id and (c.is_published or c.author_id=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and lower(coalesce(p.role,'')) in ('admin','administrator','trainer','trenér'))))
);
drop policy if exists pawmeet_course_attempts_read on public.course_attempts;
create policy pawmeet_course_attempts_read on public.course_attempts for select to authenticated using (
 user_id=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and lower(coalesce(p.role,'')) in ('admin','administrator','trainer','trenér'))
);
create or replace function public.create_course_with_test(course_title text,course_summary text,course_content text,course_level text,course_category text,quiz jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare new_course_id uuid; q jsonb; opt jsonb; new_question_id uuid; new_option_id uuid; qpos smallint:=0; opos smallint; correct_count integer;
begin
 if auth.uid() is null then raise exception 'Authentication required.'; end if;
 if not exists(select 1 from public.profiles p where p.id=auth.uid() and lower(coalesce(p.role,'')) in ('admin','administrator','trainer','trenér')) then raise exception 'Only approved trainers or administrators can create courses.'; end if;
 if length(trim(coalesce(course_title,''))) not between 1 and 180 or length(trim(coalesce(course_summary,''))) not between 1 and 600 or length(trim(coalesce(course_content,''))) not between 1 and 30000 then raise exception 'Course fields are invalid.'; end if;
 if jsonb_typeof(quiz)<>'array' or jsonb_array_length(quiz)<3 or jsonb_array_length(quiz)>20 then raise exception 'A test needs 3 to 20 questions.'; end if;
 insert into public.courses(author_id,title,summary,content,level,category,is_published) values(auth.uid(),trim(course_title),trim(course_summary),trim(course_content),coalesce(nullif(trim(course_level),''),'základní'),coalesce(nullif(trim(course_category),''),'Výchova'),true) returning id into new_course_id;
 for q in select value from jsonb_array_elements(quiz) loop
  qpos:=qpos+1;
  if length(trim(coalesce(q->>'prompt',''))) not between 1 and 800 or jsonb_typeof(q->'options')<>'array' or jsonb_array_length(q->'options') not between 2 and 6 then raise exception 'Question or options invalid.'; end if;
  select count(*) into correct_count from jsonb_array_elements(q->'options') o where coalesce((o->>'correct')::boolean,false);
  if correct_count<>1 then raise exception 'Every question must have exactly one correct answer.'; end if;
  insert into public.course_questions(course_id,prompt,position) values(new_course_id,trim(q->>'prompt'),qpos) returning id into new_question_id;
  opos:=0;
  for opt in select value from jsonb_array_elements(q->'options') loop
   opos:=opos+1;
   if length(trim(coalesce(opt->>'label',''))) not between 1 and 300 then raise exception 'Option text invalid.'; end if;
   insert into public.course_options(question_id,label,position) values(new_question_id,trim(opt->>'label'),opos) returning id into new_option_id;
   if coalesce((opt->>'correct')::boolean,false) then insert into public.course_answer_keys(question_id,correct_option_id) values(new_question_id,new_option_id); end if;
  end loop;
 end loop;
 return new_course_id;
end;
$$;
revoke all on function public.create_course_with_test(text,text,text,text,text,jsonb) from public,anon;
grant execute on function public.create_course_with_test(text,text,text,text,text,jsonb) to authenticated;
create or replace function public.submit_course_test(course_uuid uuid,selected_option_ids uuid[])
returns table(attempt_id uuid,score numeric,passed boolean,certificate_id uuid)
language plpgsql security definer set search_path=public as $$
declare qrow record; chosen uuid; total integer:=0; correct integer:=0; final_score numeric(5,2); answers_json jsonb:='[]'::jsonb; new_attempt_id uuid; new_certificate_id uuid; existing_certificate uuid; idx integer:=0;
begin
 if auth.uid() is null then raise exception 'Authentication required.'; end if;
 if not exists(select 1 from public.courses c where c.id=course_uuid and c.is_published) then raise exception 'Course is unavailable.'; end if;
 select count(*) into total from public.course_questions q where q.course_id=course_uuid;
 if total<3 or selected_option_ids is null or cardinality(selected_option_ids)<>total then raise exception 'Answer every question before submitting.'; end if;
 for qrow in select q.id,k.correct_option_id from public.course_questions q join public.course_answer_keys k on k.question_id=q.id where q.course_id=course_uuid order by q.position loop
  idx:=idx+1; chosen:=selected_option_ids[idx];
  if not exists(select 1 from public.course_options o where o.id=chosen and o.question_id=qrow.id) then raise exception 'Selected option does not belong to this question.'; end if;
  if chosen=qrow.correct_option_id then correct:=correct+1; end if;
  answers_json:=answers_json||jsonb_build_array(jsonb_build_object('question_id',qrow.id,'option_id',chosen));
 end loop;
 final_score:=round((correct::numeric/total::numeric)*100,2);
 insert into public.course_attempts(user_id,course_id,score,passed,answers) values(auth.uid(),course_uuid,final_score,final_score>=90,answers_json) returning id into new_attempt_id;
 if final_score>=90 then
  select c.id into existing_certificate from public.certificates c where c.recipient_id=auth.uid() and c.course_id=course_uuid::text and c.certificate_type='course_completion' limit 1;
  if existing_certificate is null then
   insert into public.certificates(recipient_id,course_id,title,certificate_type,issued_by,score,metadata)
   select auth.uid(),c.id::text,c.title,'course_completion',c.author_id,final_score,jsonb_build_object('course_id',c.id,'attempt_id',new_attempt_id) from public.courses c where c.id=course_uuid returning id into new_certificate_id;
  else new_certificate_id:=existing_certificate;
  end if;
 end if;
 return query select new_attempt_id,final_score,final_score>=90,new_certificate_id;
end;
$$;
revoke all on function public.submit_course_test(uuid,uuid[]) from public,anon;
grant execute on function public.submit_course_test(uuid,uuid[]) to authenticated;
create unique index if not exists certificates_one_course_completion on public.certificates(recipient_id,course_id) where certificate_type='course_completion';
