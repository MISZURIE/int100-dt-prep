import { useState } from "react";
import type { AttemptAnswer, Question } from "../lib/types";

interface Props {
  question: Question;
  position: number;
  total: number;
  answer: AttemptAnswer | undefined;
  busy: boolean;
  onSubmit: (response: string) => void;
  onSelfAssess: (isCorrect: boolean) => void;
}

const KEYS = ["A", "B", "C", "D", "E", "F"];

export function QuestionCard({ question, position, total, answer, busy, onSubmit, onSelfAssess }: Props) {
  const [draft, setDraft] = useState("");
  const answered = answer !== undefined;
  const responseId = `response-${question.id}`;

  return (
    <article className="card stack" aria-labelledby={`q-${question.id}`}>
      <div className="row row--between">
        <span className="label muted">
          ข้อ {position} / {total}
        </span>
        {question.clo_code && <span className="code muted">{question.clo_code}</span>}
      </div>

      <h2 id={`q-${question.id}`} className="question">
        {question.prompt}
      </h2>

      {question.kind === "mcq" && (
        <ul className="choices">
          {(question.choices ?? []).map((choice, i) => (
            <li key={i}>
              <button
                type="button"
                className="choice"
                aria-pressed={draft === String(i)}
                data-result={answered ? choiceResult(String(i), answer) : undefined}
                disabled={answered || busy}
                onClick={() => setDraft(String(i))}
              >
                <span className="choice__key">{KEYS[i] ?? i + 1}</span>
                <span>{choice}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {question.kind === "true_false" && (
        <ul className="choices">
          {[
            ["true", "จริง (True)"],
            ["false", "เท็จ (False)"],
          ].map(([value, text]) => (
            <li key={value}>
              <button
                type="button"
                className="choice"
                aria-pressed={draft === value}
                data-result={answered ? choiceResult(value, answer) : undefined}
                disabled={answered || busy}
                onClick={() => setDraft(value)}
              >
                <span>{text}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {question.kind === "short_answer" && (
        <div className="field">
          <label htmlFor={responseId} className="label muted">
            คำตอบของคุณ
          </label>
          <textarea
            id={responseId}
            className="textarea"
            value={answered ? answer.response : draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={answered || busy}
          />
        </div>
      )}

      {!answered && (
        <div>
          <button
            type="button"
            className="btn"
            disabled={busy || draft.trim() === ""}
            onClick={() => onSubmit(draft.trim())}
          >
            {busy ? "กำลังส่ง…" : "ส่งคำตอบ"}
          </button>
        </div>
      )}

      {answered && <Feedback question={question} answer={answer} busy={busy} onSelfAssess={onSelfAssess} />}
    </article>
  );
}

function choiceResult(value: string, answer: AttemptAnswer): "correct" | "wrong" | undefined {
  if (value === answer.correct_answer) return "correct";
  if (value === answer.response) return "wrong";
  return undefined;
}

function Feedback({
  question,
  answer,
  busy,
  onSelfAssess,
}: {
  question: Question;
  answer: AttemptAnswer;
  busy: boolean;
  onSelfAssess: (isCorrect: boolean) => void;
}) {
  if (question.kind === "short_answer") {
    return (
      <div className="feedback stack stack--tight" aria-live="polite">
        <span className="label muted">ตัวอย่างคำตอบ</span>
        <p style={{ margin: 0 }}>{answer.correct_answer}</p>
        {answer.explanation && <p className="muted" style={{ margin: 0 }}>{answer.explanation}</p>}
        {answer.is_correct === null ? (
          <div className="row">
            <span>เทียบกับคำตอบของคุณแล้ว:</span>
            <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => onSelfAssess(true)}>
              ✓ ตอบได้
            </button>
            <button type="button" className="btn btn--secondary" disabled={busy} onClick={() => onSelfAssess(false)}>
              ✕ ยังไม่ได้
            </button>
          </div>
        ) : (
          <Verdict correct={answer.is_correct} />
        )}
      </div>
    );
  }

  return (
    <div className="feedback stack stack--tight" aria-live="polite">
      <Verdict correct={answer.is_correct === true} />
      {answer.explanation && <p style={{ margin: 0 }}>{answer.explanation}</p>}
    </div>
  );
}

function Verdict({ correct }: { correct: boolean }) {
  return (
    <span className="feedback__verdict" data-result={correct ? "correct" : "wrong"}>
      {correct ? "✓ ถูกต้อง (Correct)" : "✕ ไม่ถูกต้อง (Incorrect)"}
    </span>
  );
}
