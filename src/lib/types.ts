// Row shapes for the tables in supabase/migrations. Keep in sync with the schema
// (or replace with `supabase gen types typescript --local`).

export type StageSlug = "empathize" | "define" | "ideate" | "prototype" | "test";

export interface Stage {
  id: number;
  slug: StageSlug;
  name: string;
  course_week: number;
  summary: string;
}

export interface Lesson {
  id: number;
  stage_id: number;
  slug: string;
  title: string;
  body_md: string;
  clo_codes: string[];
  sort_order: number;
}

export type QuestionKind = "mcq" | "true_false" | "short_answer";

/** Client-visible columns only: answer and explanation are not granted. */
export interface Question {
  id: number;
  stage_id: number;
  lesson_id: number | null;
  kind: QuestionKind;
  prompt: string;
  choices: string[] | null;
  clo_code: string | null;
}

export interface QuizAttempt {
  id: number;
  user_id: string;
  stage_id: number | null;
  started_at: string;
  finished_at: string | null;
  score: number | null;
}

export interface AttemptAnswer {
  attempt_id: number;
  question_id: number;
  response: string;
  is_correct: boolean | null;
  correct_answer: string | null;
  explanation: string | null;
  answered_at: string;
}

export interface StageProgress {
  stage_id: number;
  stage_slug: StageSlug;
  stage_name: string;
  course_week: number;
  lessons_total: number;
  lessons_done: number;
  questions_total: number;
  best_score: number | null;
}
