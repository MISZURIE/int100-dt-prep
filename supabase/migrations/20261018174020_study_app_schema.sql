-- INT100 Design Thinking exam-prep app
-- Content tables (stages, lessons, questions) are read-only for clients.
-- Progress tables (quiz_attempts, attempt_answers, lesson_progress) are owned per user.
-- Answers are graded in the database: clients never see questions.answer until they have answered.

-- ---------------------------------------------------------------------------
-- Content
-- ---------------------------------------------------------------------------

create table public.stages (
  id          smallint primary key,
  slug        text not null unique,
  name        text not null,
  course_week smallint not null,
  summary     text not null default ''
);

create table public.lessons (
  id         bigint generated always as identity primary key,
  stage_id   smallint not null references public.stages (id) on delete cascade,
  slug       text not null unique,
  title      text not null,
  body_md    text not null default '',
  clo_codes  text[] not null default '{}',
  sort_order smallint not null default 0
);
create index lessons_stage_id_idx on public.lessons (stage_id);

create type public.question_kind as enum ('mcq', 'true_false', 'short_answer');

create table public.questions (
  id          bigint generated always as identity primary key,
  stage_id    smallint not null references public.stages (id) on delete cascade,
  lesson_id   bigint references public.lessons (id) on delete set null,
  kind        public.question_kind not null,
  prompt      text not null,
  choices     jsonb,            -- mcq: ["A text", "B text", ...]
  answer      text not null,    -- mcq: choice index as text; true_false: 'true'/'false'; short: model answer
  explanation text not null default '',
  clo_code    text,
  constraint mcq_has_choices check (kind <> 'mcq' or jsonb_typeof(choices) = 'array')
);
create index questions_stage_id_idx on public.questions (stage_id);
create index questions_lesson_id_idx on public.questions (lesson_id);

-- ---------------------------------------------------------------------------
-- Per-user progress
-- ---------------------------------------------------------------------------

create table public.quiz_attempts (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  stage_id    smallint references public.stages (id) on delete set null, -- null = mixed quiz
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  score       numeric(5, 2)     -- set by trigger when the attempt is finished
);
create index quiz_attempts_user_id_idx on public.quiz_attempts (user_id);
create index quiz_attempts_stage_id_idx on public.quiz_attempts (stage_id);

create table public.attempt_answers (
  attempt_id     bigint not null references public.quiz_attempts (id) on delete cascade,
  question_id    bigint not null references public.questions (id) on delete cascade,
  response       text not null,
  is_correct     boolean,       -- set by trigger; short_answer is self-assessed via update
  correct_answer text,          -- copied by trigger once answered
  explanation    text,          -- copied by trigger once answered
  answered_at    timestamptz not null default now(),
  primary key (attempt_id, question_id)
);
create index attempt_answers_question_id_idx on public.attempt_answers (question_id);

create table public.lesson_progress (
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lesson_id    bigint not null references public.lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create index lesson_progress_lesson_id_idx on public.lesson_progress (lesson_id);

-- ---------------------------------------------------------------------------
-- Grading (private schema: not exposed through the Data API)
-- ---------------------------------------------------------------------------

create schema if not exists private;

-- Runs as owner so it can read questions.answer, which clients cannot select.
-- Only ever reached through the trigger below; not callable via RPC.
create function private.grade_answer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  q_kind   public.question_kind;
  q_answer text;
  q_expl   text;
begin
  if exists (select 1 from public.quiz_attempts a
             where a.id = new.attempt_id and a.finished_at is not null) then
    raise exception 'attempt % is already finished', new.attempt_id;
  end if;

  select q.kind, q.answer, q.explanation
    into q_kind, q_answer, q_expl
    from public.questions q
   where q.id = new.question_id;
  if not found then
    raise exception 'question % not found', new.question_id;
  end if;

  new.correct_answer := q_answer;
  new.explanation    := q_expl;

  if q_kind = 'short_answer' then
    -- self-assessed: starts ungraded, the student marks it on update
    if tg_op = 'INSERT' then
      new.is_correct := null;
    end if;
  elsif q_kind = 'true_false' then
    new.is_correct := lower(trim(new.response)) = q_answer;
  else
    new.is_correct := trim(new.response) = q_answer;
  end if;

  return new;
end;
$$;

-- Score is computed once, when finished_at is first set; finished attempts are frozen.
create function private.finalize_attempt()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.finished_at := null;
    new.score := null;
  elsif old.finished_at is not null then
    new.finished_at := old.finished_at;
    new.score := old.score;
    new.stage_id := old.stage_id;
  elsif new.finished_at is not null then
    select round(100.0 * count(*) filter (where aa.is_correct) / nullif(count(*), 0), 2)
      into new.score
      from public.attempt_answers aa
     where aa.attempt_id = new.id;
  else
    new.score := null;
  end if;
  return new;
end;
$$;

revoke all on function private.grade_answer() from public;
revoke all on function private.finalize_attempt() from public;

create trigger grade_answer
  before insert or update on public.attempt_answers
  for each row execute function private.grade_answer();

create trigger finalize_attempt
  before insert or update on public.quiz_attempts
  for each row execute function private.finalize_attempt();

-- ---------------------------------------------------------------------------
-- Data API exposure (new public tables are no longer exposed automatically)
-- ---------------------------------------------------------------------------

-- Start from nothing: older projects' default privileges grant everything to
-- anon/authenticated, which would make the column-level grants below meaningless.
revoke all on public.stages, public.lessons, public.questions,
              public.quiz_attempts, public.attempt_answers, public.lesson_progress
  from anon, authenticated;

grant select on public.stages, public.lessons to anon, authenticated;
-- questions: every column except answer and explanation
grant select (id, stage_id, lesson_id, kind, prompt, choices, clo_code) on public.questions to anon, authenticated;

grant select, insert, update, delete on public.quiz_attempts, public.lesson_progress to authenticated;
grant select, delete on public.attempt_answers to authenticated;
grant insert (attempt_id, question_id, response) on public.attempt_answers to authenticated;
grant update (response, is_correct) on public.attempt_answers to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.stages          enable row level security;
alter table public.lessons         enable row level security;
alter table public.questions       enable row level security;
alter table public.quiz_attempts   enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.lesson_progress enable row level security;

-- Content: anyone may read, nobody may write through the API
create policy "stages are readable" on public.stages
  for select to anon, authenticated using (true);
create policy "lessons are readable" on public.lessons
  for select to anon, authenticated using (true);
create policy "questions are readable" on public.questions
  for select to anon, authenticated using (true);

-- quiz_attempts: owner only
create policy "own attempts: select" on public.quiz_attempts
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "own attempts: insert" on public.quiz_attempts
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own attempts: update" on public.quiz_attempts
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "own attempts: delete" on public.quiz_attempts
  for delete to authenticated using ((select auth.uid()) = user_id);

-- attempt_answers: owner of the parent attempt only
create policy "own answers: select" on public.attempt_answers
  for select to authenticated using (
    exists (select 1 from public.quiz_attempts a
            where a.id = attempt_id and a.user_id = (select auth.uid()))
  );
create policy "own answers: insert" on public.attempt_answers
  for insert to authenticated with check (
    exists (select 1 from public.quiz_attempts a
            where a.id = attempt_id and a.user_id = (select auth.uid()))
  );
create policy "own answers: update" on public.attempt_answers
  for update to authenticated
  using (
    exists (select 1 from public.quiz_attempts a
            where a.id = attempt_id and a.user_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from public.quiz_attempts a
            where a.id = attempt_id and a.user_id = (select auth.uid()))
  );
create policy "own answers: delete" on public.attempt_answers
  for delete to authenticated using (
    exists (select 1 from public.quiz_attempts a
            where a.id = attempt_id and a.user_id = (select auth.uid()))
  );

-- lesson_progress: owner only
create policy "own progress: select" on public.lesson_progress
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "own progress: insert" on public.lesson_progress
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own progress: update" on public.lesson_progress
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "own progress: delete" on public.lesson_progress
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Per-stage progress summary (security_invoker so RLS applies to the caller)
-- ---------------------------------------------------------------------------

create view public.my_stage_progress
with (security_invoker = true) as
select
  s.id          as stage_id,
  s.slug        as stage_slug,
  s.name        as stage_name,
  s.course_week,
  (select count(*) from public.lessons l where l.stage_id = s.id)           as lessons_total,
  (select count(*) from public.lesson_progress p
     join public.lessons l on l.id = p.lesson_id
    where l.stage_id = s.id)                                                as lessons_done,
  (select count(*) from public.questions q where q.stage_id = s.id)         as questions_total,
  (select max(a.score) from public.quiz_attempts a
    where a.stage_id = s.id and a.finished_at is not null)                  as best_score
from public.stages s;

revoke all on public.my_stage_progress from anon, authenticated;
grant select on public.my_stage_progress to authenticated;
