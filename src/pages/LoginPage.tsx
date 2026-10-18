import { useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { toError } from "../hooks/useAsync";

type Mode = "signin" | "signup";

export function LoginPage() {
  const { session, signIn, signUp } = useAuth();
  const location = useLocation();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from ?? "/";
  if (session) return <Navigate to={from} replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        const { needsConfirmation } = await signUp(email, password);
        if (needsConfirmation) setInfo("สมัครแล้ว กรุณายืนยันอีเมลจากลิงก์ในกล่องจดหมาย แล้วกลับมาเข้าสู่ระบบ");
      }
    } catch (err) {
      setError(translateAuthError(toError(err).message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap stack">
      <div className="stack stack--tight">
        <span className="label muted">INT100 Design Thinking 1 · 1/2026</span>
        <h1 className="title">ทบทวนก่อนสอบ</h1>
        <p className="muted" style={{ margin: 0 }}>
          บทเรียนครบ 5 stage: Empathize, Define, Ideate, Prototype, Test พร้อม quiz และบันทึกความคืบหน้าของคุณ
        </p>
      </div>

      <div className="card stack">
        <div className="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            className="tab"
            aria-selected={mode === "signin"}
            onClick={() => setMode("signin")}
          >
            เข้าสู่ระบบ
          </button>
          <button
            type="button"
            role="tab"
            className="tab"
            aria-selected={mode === "signup"}
            onClick={() => setMode("signup")}
          >
            สมัครสมาชิก
          </button>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email" className="label muted">
              อีเมล
            </label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="password" className="label muted">
              รหัสผ่าน {mode === "signup" && "(อย่างน้อย 8 ตัวอักษร)"}
            </label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="notice notice--error" role="alert">
              {error}
            </div>
          )}
          {info && (
            <div className="notice" role="status">
              {info}
            </div>
          )}

          <button type="submit" className="btn" disabled={busy}>
            {busy ? "กำลังดำเนินการ…" : mode === "signin" ? "เข้าสู่ระบบ" : "สร้างบัญชี"}
          </button>
        </form>
      </div>
    </div>
  );
}

function translateAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
  if (/already registered|already exists/i.test(message)) return "อีเมลนี้สมัครแล้ว ลองเข้าสู่ระบบแทน";
  if (/password/i.test(message) && /characters|short|weak/i.test(message))
    return "รหัสผ่านสั้นหรือง่ายเกินไป ใช้อย่างน้อย 8 ตัวอักษร";
  if (/rate limit/i.test(message)) return "ลองบ่อยเกินไป รอสักครู่แล้วลองใหม่";
  return message;
}
