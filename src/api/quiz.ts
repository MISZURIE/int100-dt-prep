import { supabase } from "../lib/supabase";
import type { AttemptAnswer, QuizAttempt } from "../lib/types";

export async function startAttempt(stageId: number | null): Promise<QuizAttempt> {
  const { data, error } = await supabase
    .from("quiz_attempts")
    .insert({ stage_id: stageId })
    .select()
    .single();
  if (error) throw error;
  return data as QuizAttempt;
}

/** Inserts the response; the database grades it and returns the verdict + explanation. */
export async function submitAnswer(
  attemptId: number,
  questionId: number,
  response: string,
): Promise<AttemptAnswer> {
  const { data, error } = await supabase
    .from("attempt_answers")
    .insert({ attempt_id: attemptId, question_id: questionId, response })
    .select()
    .single();
  if (error) throw error;
  return data as AttemptAnswer;
}

/** Short-answer questions are self-assessed against the model answer. */
export async function selfAssess(
  attemptId: number,
  questionId: number,
  isCorrect: boolean,
): Promise<AttemptAnswer> {
  const { data, error } = await supabase
    .from("attempt_answers")
    .update({ is_correct: isCorrect })
    .eq("attempt_id", attemptId)
    .eq("question_id", questionId)
    .select()
    .single();
  if (error) throw error;
  return data as AttemptAnswer;
}

/** Setting finished_at makes the database compute and freeze the score. */
export async function finishAttempt(attemptId: number): Promise<QuizAttempt> {
  const { data, error } = await supabase
    .from("quiz_attempts")
    .update({ finished_at: new Date().toISOString() })
    .eq("id", attemptId)
    .select()
    .single();
  if (error) throw error;
  return data as QuizAttempt;
}

export interface AttemptSummary extends QuizAttempt {
  stages: { name: string; slug: string } | null;
  answered: number;
  correct: number;
}

export async function listAttempts(): Promise<AttemptSummary[]> {
  const { data, error } = await supabase
    .from("quiz_attempts")
    .select("*, stages(name, slug), attempt_answers(is_correct)")
    .not("finished_at", "is", null)
    .order("finished_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data as (QuizAttempt & {
    stages: { name: string; slug: string } | null;
    attempt_answers: { is_correct: boolean | null }[];
  })[]).map(({ attempt_answers, ...rest }) => ({
    ...rest,
    answered: attempt_answers.length,
    correct: attempt_answers.filter((a) => a.is_correct).length,
  }));
}
