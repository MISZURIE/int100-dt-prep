export function Loading({ label = "กำลังโหลด…" }: { label?: string }) {
  return (
    <p className="muted" role="status">
      {label}
    </p>
  );
}

export function ErrorNotice({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="notice notice--error stack stack--tight" role="alert">
      <span>โหลดข้อมูลไม่สำเร็จ: {error.message}</span>
      {onRetry && (
        <div>
          <button type="button" className="btn btn--secondary" onClick={onRetry}>
            ลองใหม่
          </button>
        </div>
      )}
    </div>
  );
}
