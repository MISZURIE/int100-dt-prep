import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="stack">
      <h1 className="title">ไม่พบหน้านี้</h1>
      <p className="muted" style={{ margin: 0 }}>
        ลิงก์อาจผิดหรือเนื้อหาถูกย้ายแล้ว
      </p>
      <div>
        <Link to="/" className="btn">
          กลับภาพรวม
        </Link>
      </div>
    </section>
  );
}
