"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="ar" dir="rtl"><body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, fontFamily: "Arial, sans-serif", background: "#fff8fb", color: "#28253a" }}><main style={{ maxWidth: 420, padding: 28, textAlign: "center", borderRadius: 24, background: "white", boxShadow: "0 16px 40px rgba(40,37,58,.1)" }}><h1 style={{ marginTop: 0, fontSize: "1.25rem" }}>تعذر فتح الصفحة الآن</h1><p style={{ lineHeight: 1.8, color: "#777487" }}>لم تُعدّل أي بيانات. يمكنكِ إعادة المحاولة، أو العودة لاحقاً إذا استمرّ الخطأ.</p><button type="button" onClick={reset} style={{ border: 0, borderRadius: 14, padding: "12px 18px", background: "#ed3f73", color: "white", fontWeight: 700, cursor: "pointer" }}>إعادة المحاولة</button></main></body></html>;
}
