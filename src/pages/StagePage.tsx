import { Link, useParams } from "react-router-dom";
import { getStageBySlug, listLessons } from "../api/content";
import { listCompletedLessonIds } from "../api/progress";
import { useAsync } from "../hooks/useAsync";
import { ErrorNotice, Loading } from "../components/Status";
import { StageChip } from "../components/StageChip";
import { NotFoundPage } from "./NotFoundPage";

export function StagePage() {
  const { slug = "" } = useParams();
  const { data, error, loading, reload } = useAsync(async () => {
    const stage = await getStageBySlug(slug);
    if (!stage) return null;
    const [lessons, done] = await Promise.all([listLessons(stage.id), listCompletedLessonIds()]);
    return { stage, lessons, done };
  }, [slug]);

  if (loading) return <Loading />;
  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <NotFoundPage />;

  const { stage, lessons, done } = data;

  return (
    <>
      <section className="stack">
        <div>
          <StageChip slug={stage.slug} name={stage.name} week={stage.course_week} />
        </div>
        <h1 className="title">{stage.name}</h1>
        <p className="prose" style={{ margin: 0 }}>
          {stage.summary}
        </p>
        <div className="row">
          <Link to={`/quiz/${stage.slug}`} className="btn">
            เริ่ม quiz {stage.name}
          </Link>
          <Link to="/" className="btn btn--secondary">
            กลับภาพรวม
          </Link>
        </div>
      </section>

      <section className="stack" aria-labelledby="lessons-heading">
        <h2 id="lessons-heading" className="heading">
          บทเรียน
        </h2>
        {lessons.length === 0 ? (
          <p className="muted">ยังไม่มีบทเรียนใน stage นี้</p>
        ) : (
          <ul className="list">
            {lessons.map((lesson) => (
              <li key={lesson.id}>
                <Link to={`/lessons/${lesson.slug}`} className="card-link">
                  <div className="card row row--between">
                    <span style={{ fontWeight: 600 }}>{lesson.title}</span>
                    <span className="label" style={{ color: done.has(lesson.id) ? "var(--correct)" : "var(--ink-muted)" }}>
                      {done.has(lesson.id) ? "✓ อ่านแล้ว" : "ยังไม่อ่าน"}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
