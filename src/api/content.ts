import { supabase } from "../lib/supabase";
import type { Lesson, Question, Stage } from "../lib/types";

// questions.answer / explanation are hidden by column grants, so never select("*") here.
const QUESTION_COLUMNS = "id, stage_id, lesson_id, kind, prompt, choices, clo_code";

export async function listStages(): Promise<Stage[]> {
  const { data, error } = await supabase.from("stages").select("*").order("id");
  if (error) throw error;
  return data as Stage[];
}

export async function getStageBySlug(slug: string): Promise<Stage | null> {
  const { data, error } = await supabase.from("stages").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data as Stage | null;
}

export async function listLessons(stageId: number): Promise<Lesson[]> {
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("stage_id", stageId)
    .order("sort_order");
  if (error) throw error;
  return data as Lesson[];
}

export async function getLessonBySlug(slug: string): Promise<Lesson | null> {
  const { data, error } = await supabase.from("lessons").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data as Lesson | null;
}

/** Questions for one stage, or every stage when stageId is null. */
export async function listQuestions(stageId: number | null): Promise<Question[]> {
  let query = supabase.from("questions").select(QUESTION_COLUMNS).order("id");
  if (stageId !== null) query = query.eq("stage_id", stageId);
  const { data, error } = await query;
  if (error) throw error;
  return data as Question[];
}
