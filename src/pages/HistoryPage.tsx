import { Link } from "react-router-dom";
import { listAttempts } from "../api/quiz";
import { useAsync } from "../hooks/useAsync";
import { ErrorNotice, Loading } from "../components/Status";

const dateFormat = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" });

export function HistoryPage() {
  const { data, error, loading, reload } = useAsync(listAttempts, []);

  if (loading) return <Loading />;
  if (error) return <ErrorNotice error={error} onRetry={reload} />;

  const attempts = data ?? [];

  return (
    <section className="stack">
      <h1 className="title">ประวัติการทำ quiz</h1>
      {attempts.length === 0 ? (
        <div className="notice stack stack--tight">
          <span>ยังไม่มี quiz ที่ทำเสร็จ</span>
          <div>
            <Link to="/quiz/all" className="btn">
              เริ่ม quiz รวม
            </Link>
          </div>
        </div>
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th className="label muted">วันที่</th>
                <th className="label muted">Quiz</th>
                <th className="label muted num">ถูก</th>
                <th className="label muted num">คะแนน</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a) => (
                <tr key={a.id}>
                  <td>{dateFormat.format(new Date(a.finished_at!))}</td>
                  <td>{a.stages?.name ?? "รวมทุก stage"}</td>
                  <td className="num">
                    {a.correct}/{a.answered}
                  </td>
                  <td className="num code">{a.score === null ? "–" : `${Number(a.score)}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
