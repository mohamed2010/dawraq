"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";

async function request(path: string, body: unknown) {
  const response = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error ?? "تعذر تنفيذ الطلب الآن.");
  return payload;
}

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (token) {
        await request("/api/auth/password-reset/confirm", { token, newPassword: password });
        setMessage("تم تغيير كلمة المرور وتسجيل دخولكِ بأمان. يمكنكِ العودة إلى التطبيق.");
      } else {
        const result = await request("/api/auth/password-reset/request", { email });
        setMessage(result.message);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تنفيذ الطلب الآن.");
    } finally {
      setBusy(false);
    }
  };

  return <main className="tracker-app login-page" data-theme="pink"><section className="surface-card login-card"><div className="login-content"><div className="brand-mark">ز</div><h1>{token ? "أنشئي كلمة مرور جديدة" : "استعادة كلمة المرور"}</h1><p>{token ? "استخدمي كلمة مرور جديدة مكونة من ثمانية أحرف على الأقل." : "أدخلي بريدكِ. تظهر الرسالة نفسها سواء كان الحساب موجوداً أم لا، حفاظاً على الخصوصية."}</p><form className="mt-5 grid gap-3" onSubmit={submit}>{token ? <input className="rounded-xl border border-black/10 bg-white/80 px-3 py-2.5 text-right text-sm" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} placeholder="كلمة المرور الجديدة" dir="ltr" /> : <input className="rounded-xl border border-black/10 bg-white/80 px-3 py-2.5 text-right text-sm" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="البريد الإلكتروني" dir="ltr" />}{error && <p role="alert" className="text-center text-xs text-red-700">{error}</p>}{message && <p role="status" className="text-center text-xs text-emerald-700">{message}</p>}<button className="primary-button w-full" disabled={busy}>{busy ? "جارٍ التنفيذ…" : token ? "حفظ كلمة المرور الجديدة" : "إرسال رابط الاستعادة"}</button></form><a className="mt-4 block text-center text-xs font-semibold text-[var(--primary)] underline underline-offset-4" href="/">العودة إلى تسجيل الدخول</a></div></section></main>;
}
