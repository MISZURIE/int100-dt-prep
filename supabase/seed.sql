-- Seed content from the INT100 1/2026 course plan (TQF3, revised 24 July 2026)
-- and the d.school "Design Thinking Bootleg" (main textbook).

-- The five stages and the 150-question bank come from migrations, which run before this file.
-- This file adds the lessons and a few extra warm-up questions linked to them.
-- Run it once: on a hosted project use `db push --include-seed` only the first time.

insert into public.lessons (stage_id, slug, title, clo_codes, sort_order, body_md) values
  (1, 'empathize-basics', 'Empathize and why it matters', '{1A-I}', 1,
   E'- Observe, engage (interview), immerse.\n- Ask "why" to uncover needs; look for contradictions between what people say and do.\n- Artifacts: interview notes, empathy map (Say / Do / Think / Feel).'),
  (2, 'define-pov', 'Define: Point of View and HMW', '{1A-I,1C-I}', 1,
   E'- POV = User + Need + Insight. Needs are verbs, not solutions.\n- Turn the POV into "How might we ...?" questions to launch ideation.'),
  (3, 'ideate-basics', 'Ideate and giving feedback', '{1A-I,1C-I}', 1,
   E'- Brainstorm rules: defer judgment, go for volume, build on others'' ideas, stay on topic, be visual.\n- Feedback format: "I like / I wish / What if".'),
  (4, 'prototype-basics', 'Prototype to think and to learn', '{1A-I,1C-I,5UX-I}', 1,
   E'- Build to think; keep it rough and cheap.\n- Each prototype should answer a specific question.'),
  (5, 'test-basics', 'Test with users', '{1A-I,5UX-I}', 1,
   E'- Show, don''t tell: let users experience the prototype.\n- Capture feedback in a grid: Likes / Criticisms / Questions / Ideas.\n- Testing can send you back to refine the POV.');

insert into public.questions (stage_id, lesson_id, kind, prompt, choices, answer, explanation, clo_code)
select s.stage_id, l.id, s.kind::public.question_kind, s.prompt, s.choices::jsonb, s.answer, s.explanation, s.clo_code
from (values
  (1, 'empathize-basics', 'mcq', 'Which four quadrants make up a typical empathy map?',
   '["Say, Do, Think, Feel", "Who, What, When, Where", "Likes, Criticisms, Questions, Ideas", "User, Need, Insight, Action"]',
   '0', 'Say/Do come from observation and interviews; Think/Feel are inferred.', '1A-I'),
  (1, 'empathize-basics', 'true_false', 'In Empathize, what users say is always more reliable than what they do.',
   null, 'false', 'Contradictions between saying and doing often reveal the deepest insights.', '1A-I'),
  (2, 'define-pov', 'mcq', 'A Point of View statement combines:',
   '["User + Need + Insight", "Problem + Solution + Cost", "Persona + Feature + Metric", "Idea + Prototype + Test"]',
   '0', 'POV = [user] needs [need] because [insight].', '1A-I'),
  (2, 'define-pov', 'short_answer', 'Rewrite this as a needs-based POV: "Students need an app to track deadlines."',
   null, 'e.g. "First-year students need to feel in control of overlapping deadlines because missing one early erodes their confidence."',
   'A need should be a verb/feeling, not a solution like "an app".', '1C-I'),
  (3, 'ideate-basics', 'mcq', 'Which is NOT a brainstorming rule?',
   '["Defer judgment", "Go for volume", "Pick the best idea as early as possible", "Build on the ideas of others"]',
   '2', 'Selecting comes after generating; early judgment kills volume.', '1C-I'),
  (4, 'prototype-basics', 'true_false', 'A good early prototype should be polished so users take it seriously.',
   null, 'false', 'Low-resolution prototypes are cheap to change and invite honest feedback.', '5UX-I'),
  (5, 'test-basics', 'mcq', 'The feedback capture grid has which four sections?',
   '["Likes, Criticisms, Questions, Ideas", "Say, Do, Think, Feel", "Strengths, Weaknesses, Opportunities, Threats", "Plan, Do, Check, Act"]',
   '0', 'Use it to record test results quickly and consistently.', '5UX-I')
) as s(stage_id, lesson_slug, kind, prompt, choices, answer, explanation, clo_code)
join public.lessons l on l.slug = s.lesson_slug;

-- Link every question that has no lesson yet to the lesson of its stage.
update public.questions q
   set lesson_id = (select l.id from public.lessons l where l.stage_id = q.stage_id order by l.sort_order, l.id limit 1)
 where q.lesson_id is null;
