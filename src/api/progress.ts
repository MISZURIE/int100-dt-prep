import { supabase } from "../lib/supabase";
import type { StageProgress } from "../lib/types";

export async function listStageProgress(): Promise<StageProgress[]> {
  const { data, error } = await supabase.from("my_stage_progress").select("*").order("stage_id");
  if (error) throw error;
  return data as StageProgress[];
}

export async function listCompletedLessonIds(): Promise<Set<number>> {
  const { data, error } = await supabase.from("lesson_progress").select("lesson_id");
  if (error) throw error;
  return new Set((data as { lesson_id: number }[]).map((r) => r.lesson_id));
}

export async function setLessonComplete(lessonId: number, done: boolean): Promise<void> {
  if (done) {
    const { error } = await supabase
      .from("lesson_progress")
      .upsert({ lesson_id: lessonId }, { onConflict: "user_id,lesson_id", ignoreDuplicates: true });
    if (error) throw error;
  } else {
    const { error } = await supabase.from("lesson_progress").delete().eq("lesson_id", lessonId);
    if (error) throw error;
  }
}
