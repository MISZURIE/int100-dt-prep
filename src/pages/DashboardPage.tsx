import { Link } from "react-router-dom";
import { listStageProgress } from "../api/progress";
import { listStages } from "../api/content";
import { useAsync } from "../hooks/useAsync";
import { ErrorNotice, Loading } from "../components/Status";
import { ProgressBar } from "../components/ProgressBar";
import { StageChip } from "../components/StageChip";

export function DashboardPage() {
  const progress = useAsync(listStageProgress, []);
  const stages = useAsync(listStages, []);

  if (progress.loading || stages.loading) return <Loading />;
  if (progress.error) return <ErrorNotice error={progress.error} onRetry={progress.reload} />;
  if (stages.error) return <ErrorNotice error={stages.error} onRetry={stages.reload} />;

  const rows = progress.data ?? [];
  const summaries = new Map((stages.data ?? []).map((s) => [s.id, s.summary]));
  const lessonsDone = rows.reduce((n, r) => n + r.lessons_done, 0);
  const lessonsTotal = rows.reduce((n, r) => n + r.lessons_total, 0);
  const scored = rows.filter((r) => r.best_score !== null);
  const avgBest = scored.length
    ? Math.round(scored.reduce((n, r) => n + Number(r.best_score), 0) / scored.length)
    : null;

  return (
    <>
      <section className="stack">
        <span className="label muted">ภาพรวม · สอบกลางภาค week 12</span>
        <h1 className="title">ความคืบหน้าของคุณ</h1>
        <div className="card stats">
          <Stat value={`${lessonsDone}/${lessonsTotal}`} label="บทเรียนที่อ่านแล้ว" />
          <Stat value={`${scored.length}/${rows.length}`} label="Stage ที่ทำ quiz แล้ว" />
          <Stat value={avgBest === null ? "–" : `${avgBest}%`} label="คะแนนเฉลี่ย (ดีที่สุด)" />
        </div>
      </section>

      <section className="stack" aria-labelledby="stages-heading">
        <h2 id="stages-heading" className="heading">
          5 Stage ของ Design Thinking
        </h2>
        <ul className="list">
          {rows.map((r) => (
            <li key={r.stage_id}>
              <Link to={`/stages/${r.stage_slug}`} className="card-link">
                <div className="card stack stack--tight">
                  <div className="row row--between">
                    <StageChip slug={r.stage_slug} name={r.stage_name} week={r.course_week} />
                    <span className="code muted">
                      {r.best_score === null ? "ยังไม่ทำ quiz" : `best ${Number(r.best_score)}%`}
                    </span>
                  </div>
                  <p style={{ margin: 0 }}>{summaries.get(r.stage_id)}</p>
                  <ProgressBar
                    value={r.lessons_done}
                    max={r.lessons_total}
                    label={`${r.stage_name}: อ่านแล้ว ${r.lessons_done} จาก ${r.lessons_total} บท`}
                  />
                  <span className="muted">
                    อ่านแล้ว {r.lessons_done}/{r.lessons_total} บท · {r.questions_total} คำถาม
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="stat__value">{value}</div>
      <div className="muted">{label}</div>
    </div>
  );
}
