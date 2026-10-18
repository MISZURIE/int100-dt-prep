import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getStageBySlug, listQuestions } from "../api/content";
import { finishAttempt, selfAssess, startAttempt, submitAnswer } from "../api/quiz";
import { toError, useAsync } from "../hooks/useAsync";
import { ErrorNotice, Loading } from "../components/Status";
import { QuestionCard } from "../components/QuestionCard";
import { StageChip } from "../components/StageChip";
import { NotFoundPage } from "./NotFoundPage";
import type { AttemptAnswer, Question, QuizAttempt, Stage } from "../lib/types";

/** The mixed quiz draws this many random questions; a stage quiz uses all of its questions. */
const MIXED_QUIZ_SIZE = 30;

/** /quiz/all runs a random mix from every stage; /quiz/:stage runs one stage. */
export function QuizPage() {
  const { slug = "all" } = useParams();
  const setup = useAsync(async () => {
    const stage = slug === "all" ? null : await getStageBySlug(slug);
    if (slug !== "all" && !stage) return null;
    const all = shuffle(await listQuestions(stage?.id ?? null));
    const questions = stage ? all : all.slice(0, MIXED_QUIZ_SIZE);
    return { stage, questions };
  }, [slug]);

  if (setup.loading) return <Loading />;
  if (setup.error) return <ErrorNotice error={setup.error} onRetry={setup.reload} />;
  if (!setup.data) return <NotFoundPage />;
  if (setup.data.questions.length === 0) return <p className="muted">ยังไม่มีคำถามสำหรับ quiz นี้</p>;

  return <QuizRunner key={slug} stage={setup.data.stage} questions={setup.data.questions} />;
}

function QuizRunner({ stage, questions }: { stage: Stage | null; questions: Question[] }) {
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, AttemptAnswer>>(new Map());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const title = stage ? `Quiz: ${stage.name}` : "Quiz รวมทุก stage";

  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError(toError(err));
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  const begin = () => run(async () => setAttempt(await startAttempt(stage?.id ?? null)));

  if (!attempt) {
    return (
      <section className="stack">
        {stage && (
          <div>
            <StageChip slug={stage.slug} name={stage.name} week={stage.course_week} />
          </div>
        )}
        <h1 className="title">{title}</h1>
        <p className="muted" style={{ margin: 0 }}>
          {questions.length} คำถาม ระบบตรวจข้อ multiple choice และ true/false ให้ทันที ส่วนข้อเขียนให้เทียบกับตัวอย่างคำตอบแล้วประเมินตัวเอง
        </p>
        {error && <ErrorNotice error={error} />}
        <div>
          <button type="button" className="btn" disabled={busy} onClick={begin}>
            เริ่มทำ quiz
          </button>
        </div>
      </section>
    );
  }

  if (attempt.finished_at) {
    return <QuizResult attempt={attempt} stage={stage} total={questions.length} answers={answers} />;
  }

  const question = questions[index];
  const current = answers.get(question.id);
  const isLast = index === questions.length - 1;
  const waitingSelfAssess = current?.is_correct === null;

  const submit = (response: string) =>
    run(async () => {
      const saved = await submitAnswer(attempt.id, question.id, response);
      setAnswers((prev) => new Map(prev).set(question.id, saved));
    });

  const assess = (isCorrect: boolean) =>
    run(async () => {
      const saved = await selfAssess(attempt.id, question.id, isCorrect);
      setAnswers((prev) => new Map(prev).set(question.id, saved));
    });

  const finish = () => run(async () => setAttempt(await finishAttempt(attempt.id)));

  return (
    <section className="stack">
      <div className="row row--between">
        <h1 className="heading">{title}</h1>
        <span className="code muted">
          {answers.size}/{questions.length} ตอบแล้ว
        </span>
      </div>

      <QuestionCard
        key={question.id}
        question={question}
        position={index + 1}
        total={questions.length}
        answer={current}
        busy={busy}
        onSubmit={submit}
        onSelfAssess={assess}
      />

      {error && <ErrorNotice error={error} />}

      <div className="row row--between">
        <button
          type="button"
          className="btn btn--secondary"
          disabled={index === 0 || busy}
          onClick={() => setIndex((i) => i - 1)}
        >
          ← ข้อก่อนหน้า
        </button>
        {isLast ? (
          <button
            type="button"
            className="btn"
            disabled={busy || !current || waitingSelfAssess}
            onClick={finish}
          >
            ส่ง quiz และดูคะแนน
          </button>
        ) : (
          <button
            type="button"
            className="btn"
            disabled={busy || !current || waitingSelfAssess}
            onClick={() => setIndex((i) => i + 1)}
          >
            ข้อถัดไป →
          </button>
        )}
      </div>
    </section>
  );
}

function QuizResult({
  attempt,
  stage,
  total,
  answers,
}: {
  attempt: QuizAttempt;
  stage: Stage | null;
  total: number;
  answers: Map<number, AttemptAnswer>;
}) {
  const correct = [...answers.values()].filter((a) => a.is_correct).length;
  return (
    <section className="stack">
      <span className="label muted">ผลลัพธ์</span>
      <h1 className="title">{attempt.score === null ? "–" : `${Number(attempt.score)}%`}</h1>
      <p style={{ margin: 0 }}>
        ถูก {correct} จาก {total} ข้อ
      </p>
      <div className="row">
        <Link to={stage ? `/stages/${stage.slug}` : "/"} className="btn">
          {stage ? `ทบทวน ${stage.name}` : "กลับภาพรวม"}
        </Link>
        <Link to="/history" className="btn btn--secondary">
          ดูประวัติ
        </Link>
      </div>
    </section>
  );
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
