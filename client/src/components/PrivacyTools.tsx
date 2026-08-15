"use client";

import { api, type PersonalSummary } from "@/lib/api";
import { Download, KeyRound, LockKeyhole, Printer, ShieldCheck, UnlockKeyhole } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

function printSummary(summary: PersonalSummary) {
  const lines = [
    "ملخص شخصي من زُهيرة",
    `أُنشئ في: ${new Date(summary.generatedAt).toLocaleString("ar-EG")}`,
    "",
    `الاسم: ${summary.profile?.displayName ?? "—"}`,
    `متوسط الدورة: ${summary.profile?.averageCycleLength ?? "—"} يوم`,
    `الدورات المسجلة: ${summary.cycles.length}`,
    `المتابعات اليومية: ${summary.dailyEntries.length}`,
    `الأدوية النشطة: ${summary.medications.filter(medication => medication.isActive).map(medication => `${medication.name} (${medication.dosage})`).join("، ") || "لا يوجد"}`,
    "",
    "هذا ملخص شخصي تنظيمي وليس تشخيصاً أو وصفة علاجية.",
  ];
  const popup = window.open("", "_blank", "noopener,noreferrer");
  if (!popup) return toast.error("اسمحي بفتح نافذة الطباعة لتنزيل الملخص.");
  popup.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><title>ملخص زُهيرة</title><style>body{font-family:Arial,sans-serif;margin:40px;line-height:2;color:#2b2432}h1{color:#c9265b;font-size:24px}pre{white-space:pre-wrap;font:inherit}</style></head><body><h1>ملخص زُهيرة الشخصي</h1><pre>${lines.join("\n").replace(/[<>&]/g, character => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[character] ?? character)}</pre><script>window.print()</script></body></html>`);
  popup.document.close();
}

export function PrivacyToolsPanel({ onLockStatusChange }: { onLockStatusChange: () => Promise<unknown> }) {
  const lockStatus = api.privacyLock.status.useQuery(undefined, { enabled: true });
  const saveLock = api.privacyLock.save.useMutation();
  const summaryQuery = api.reports.summary.useQuery(undefined, { enabled: false });
  const [pin, setPin] = useState("");
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!pin.match(/^\d{4,8}$/)) return toast.error("اختاري رمزاً رقمياً بين 4 و8 أرقام.");
    try { await saveLock.mutateAsync({ pin }); await onLockStatusChange(); setPin(""); toast.success("تم تفعيل قفل الخصوصية السريع."); } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر حفظ القفل."); }
  };
  const disable = async () => { try { await saveLock.mutateAsync({ pin: null }); await onLockStatusChange(); toast.success("تم إيقاف قفل الخصوصية."); } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تعديل القفل."); } };
  const exportSummary = async () => { try { const result = await summaryQuery.refetch(); if (!result.data) throw new Error("تعذر تجهيز الملخص."); printSummary(result.data); } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تجهيز الملخص."); } };

  return <section className="surface-card page-card privacy-tools"><div className="section-header"><div><h2>خصوصية وتصدير</h2><p>التحكم في شاشة التطبيق والبيانات التي تختارين مشاركتها.</p></div><ShieldCheck size={21} color="var(--green)" /></div><div className="settings-group"><h3>قفل سريع داخل التطبيق</h3><p>يقفل تفاصيل التطبيق عند انتقاله للخلفية، ويطلب رمزاً لإظهارها ثانية. هذا ليس بديلاً عن قفل الهاتف أو كلمة مرور الحساب.</p>{lockStatus.data?.enabled ? <div className="notification-card"><div><strong>قفل الخصوصية مفعّل</strong><span>سيُطلب الرمز عند العودة للتطبيق بعد إخفائه.</span></div><button className="secondary-button" type="button" onClick={() => void disable()} disabled={saveLock.isPending}><UnlockKeyhole size={16} />إيقاف</button></div> : <form className="form-stack" onSubmit={save}><div className="field"><label htmlFor="privacy-pin">رمز القفل السريع</label><input id="privacy-pin" inputMode="numeric" type="password" autoComplete="new-password" value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="4 إلى 8 أرقام" /><span className="field-hint">لا نعرض الرمز أو نخزنه كنص قابل للقراءة.</span></div><button className="secondary-button" type="submit" disabled={saveLock.isPending}><LockKeyhole size={16} />تفعيل القفل</button></form>}</div><div className="settings-group"><h3>تقرير شخصي قابل للطباعة</h3><p>أنشئي ملخصاً مختصراً من سجلاتكِ الفعلية فقط، ثم اختاري «حفظ كملف PDF» من نافذة الطباعة إذا أردتِ مشاركته مع مختصة.</p><button className="secondary-button" type="button" onClick={() => void exportSummary()} disabled={summaryQuery.isFetching}><Printer size={16} />{summaryQuery.isFetching ? "جارٍ تجهيز الملخص..." : "تجهيز ملخص للطباعة"}</button><span className="field-hint"><Download size={13} />لا يُرسل التقرير إلى أي جهة من التطبيق.</span></div></section>;
}

export function AppLockScreen({ onUnlock }: { onUnlock: () => void }) {
  const verify = api.privacyLock.verify.useMutation();
  const [pin, setPin] = useState("");
  const submit = async (event: FormEvent) => { event.preventDefault(); try { await verify.mutateAsync({ pin }); setPin(""); onUnlock(); } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر فتح التطبيق."); } };
  return <div className="tracker-app login-page" data-theme="pink" dir="rtl"><form className="surface-card login-card" onSubmit={submit}><div className="login-content"><div className="brand-mark"><KeyRound size={25} /></div><h1>التطبيق مقفل</h1><p>أدخلي رمز القفل السريع لإظهار تفاصيلكِ الخاصة.</p><div className="form-stack"><div className="field"><label htmlFor="unlock-pin">رمز القفل</label><input id="unlock-pin" inputMode="numeric" type="password" autoFocus value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, "").slice(0, 8))} /></div><button className="primary-button" type="submit" disabled={verify.isPending}><UnlockKeyhole size={16} />{verify.isPending ? "جارٍ الفتح..." : "فتح التطبيق"}</button></div></div></form></div>;
}
