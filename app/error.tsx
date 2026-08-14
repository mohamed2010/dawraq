"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="tracker-app login-page" data-theme="pink"><section className="surface-card login-card"><div className="login-content"><h1>تعذر فتح هذه الصفحة الآن</h1><p>لم نُجرِ أي تعديل على بياناتكِ. أعيدي المحاولة بعد لحظات.</p><button type="button" className="primary-button w-full mt-6" onClick={reset}>إعادة المحاولة</button></div></section></main>;
}
