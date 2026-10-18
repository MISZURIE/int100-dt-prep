import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import Markdown from "react-markdown";
import { getLessonBySlug, listStages } from "../api/content";
import { listCompletedLessonIds, setLessonComplete } from "../api/progress";
import { toError, useAsync } from "../hooks/useAsync";
import { ErrorNotice, Loading } from "../components/Status";
import { StageChip } from "../components/StageChip";
import { NotFoundPage } from "./NotFoundPage";

export function LessonPage() {
  const { slug = "" } = useParams();
  const { data, error, loading, reload } = useAsync(async () => {
    const lesson = await getLessonBySlug(slug);
    if (!lesson) return null;
    const [stages, done] = await Promise.all([listStages(), listCompletedLessonIds()]);
    return { lesson, stage: stages.find((s) => s.id === lesson.stage_id)!, completed: done.has(lesson.id) };
  }, [slug]);

  const [override, setOverride] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);

  if (loading) return <Loading />;
  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <NotFoundPage />;

  const { lesson, stage } = data;
  const completed = override ?? data.completed;

  async function toggle() {
    setSaving(true);
    setSaveError(null);
    try {
      await setLessonComplete(lesson.id, !completed);
      setOverride(!completed);
    } catch (err) {
      setSaveError(toError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="stack">
      <div className="row">
        <StageChip slug={stage.slug} name={stage.name} week={stage.course_week} />
        {lesson.clo_codes.map((code) => (
          <span key={code} className="code muted">
            {code}
          </span>
        ))}
      </div>
      <h1 className="title">{lesson.title}</h1>

      <div className="card prose">
        <Markdown>{lesson.body_md}</Markdown>
      </div>

      {saveError && <ErrorNotice error={saveError} />}

      <div className="row">
        <button type="button" className={completed ? "btn btn--secondary" : "btn"} disabled={saving} onClick={toggle}>
          {completed ? "✓ อ่านแล้ว (กดเพื่อยกเลิก)" : "ทำเครื่องหมายว่าอ่านแล้ว"}
        </button>
        <Link to={`/quiz/${stage.slug}`} className="btn btn--secondary">
          ทำ quiz {stage.name}
        </Link>
        <Link to={`/stages/${stage.slug}`} className="btn btn--ghost">
          กลับไป {stage.name}
        </Link>
      </div>
    </article>
  );
}
