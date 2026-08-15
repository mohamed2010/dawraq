"use client";

import { api, type PersonalSummary } from "@/lib/api";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { Copy, Download, Fingerprint, KeyRound, Link2, LockKeyhole, Printer, ShieldAlert, ShieldCheck, Trash2, UnlockKeyhole } from "lucide-react";
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

function downloadRawData(summary: PersonalSummary) {
  const content = JSON.stringify({ exportedAt: summary.generatedAt, source: "Zuhaira personal export", data: summary }, null, 2);
  const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `zuhaira-private-export-${summary.generatedAt.slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function PrivacyToolsPanel({ onLockStatusChange, onAccountDeleted }: { onLockStatusChange: () => Promise<unknown>; onAccountDeleted: () => Promise<void> }) {
  const lockStatus = api.privacyLock.status.useQuery(undefined, { enabled: true });
  const saveLock = api.privacyLock.save.useMutation();
  const summaryQuery = api.reports.summary.useQuery(undefined, { enabled: false });
  const deleteAccount = api.account.delete.useMutation();
  const [pin, setPin] = useState("");
  const [deletionConfirmation, setDeletionConfirmation] = useState("");
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!pin.match(/^\d{4,8}$/)) return toast.error("اختاري رمزاً رقمياً بين 4 و8 أرقام.");
    try { await saveLock.mutateAsync({ pin }); await onLockStatusChange(); setPin(""); toast.success("تم تفعيل قفل الخصوصية السريع."); } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر حفظ القفل."); }
  };
  const disable = async () => { try { await saveLock.mutateAsync({ pin: null }); await onLockStatusChange(); toast.success("تم إيقاف قفل الخصوصية."); } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تعديل القفل."); } };
  const withSummary = async (action: (summary: PersonalSummary) => void) => { try { const result = await summaryQuery.refetch(); if (!result.data) throw new Error("تعذر تجهيز البيانات."); action(result.data); } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تجهيز البيانات."); } };
  const removeAccount = async () => {
    if (deletionConfirmation !== "حذف حسابي") return;
    try { await deleteAccount.mutateAsync({ confirmation: "حذف حسابي" }); await onAccountDeleted(); toast.success("تم حذف الحساب وبياناته الخاصة."); } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر حذف الحساب."); }
  };

  return <section className="surface-card page-card privacy-tools"><div className="section-header"><div><h2>خصوصية وتصدير</h2><p>التحكم في شاشة التطبيق والبيانات التي تختارين مشاركتها.</p></div><ShieldCheck size={21} color="var(--green)" /></div><div className="settings-group"><h3>قفل سريع داخل التطبيق</h3><p>يقفل تفاصيل التطبيق عند انتقاله للخلفية، ويطلب رمزاً لإظهارها ثانية. هذا ليس بديلاً عن قفل الهاتف أو كلمة مرور الحساب.</p>{lockStatus.data?.enabled ? <div className="notification-card"><div><strong>قفل الخصوصية مفعّل</strong><span>سيُطلب الرمز عند العودة للتطبيق بعد إخفائه.</span></div><button className="secondary-button" type="button" onClick={() => void disable()} disabled={saveLock.isPending}><UnlockKeyhole size={16} />إيقاف</button></div> : <form className="form-stack" onSubmit={save}><div className="field"><label htmlFor="privacy-pin">رمز القفل السريع</label><input id="privacy-pin" inputMode="numeric" type="password" autoComplete="new-password" value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="4 إلى 8 أرقام" /><span className="field-hint">لا نعرض الرمز أو نخزنه كنص قابل للقراءة.</span></div><button className="secondary-button" type="submit" disabled={saveLock.isPending}><LockKeyhole size={16} />تفعيل القفل</button></form>}</div><div className="settings-group"><h3>تقرير ونسخة بيانات خاصة</h3><p>أنشئي ملخصاً للطباعة أو نزّلي نسخة JSON خاصة تحتوي على سجلاتكِ الفعلية، بما فيها القياسات الجديدة. لا تُرسل البيانات إلى أي جهة من التطبيق.</p><div className="day-actions"><button className="secondary-button" type="button" onClick={() => void withSummary(printSummary)} disabled={summaryQuery.isFetching}><Printer size={16} />تجهيز ملخص للطباعة</button><button className="secondary-button" type="button" onClick={() => void withSummary(downloadRawData)} disabled={summaryQuery.isFetching}><Download size={16} />تنزيل نسخة بيانات</button></div></div><div className="settings-group danger-zone"><h3><ShieldAlert size={17} />حذف الحساب والبيانات</h3><p>سيُحذف حسابكِ وجميع دوراتكِ ومتابعاتكِ وأدويتكِ نهائياً. لا يمكن التراجع عن هذه العملية.</p><div className="field"><label htmlFor="account-deletion">للتأكيد، اكتبي: حذف حسابي</label><input id="account-deletion" value={deletionConfirmation} onChange={event => setDeletionConfirmation(event.target.value)} placeholder="حذف حسابي" /></div><button className="danger-button" type="button" disabled={deletionConfirmation !== "حذف حسابي" || deleteAccount.isPending} onClick={() => void removeAccount()}><Trash2 size={16} />{deleteAccount.isPending ? "جارٍ الحذف..." : "حذف حسابي نهائياً"}</button></div></section>;
}

export function ClinicianSharingPanel() {
  const sharesQuery = api.shares.list.useQuery(undefined, { enabled: true });
  const createShare = api.shares.create.useMutation();
  const revokeShare = api.shares.revoke.useMutation();
  const [newShareUrl, setNewShareUrl] = useState("");
  const create = async (expiresInHours: 24 | 72) => {
    try {
      const share = await createShare.mutateAsync({ expiresInHours });
      setNewShareUrl(share.url);
      await navigator.clipboard?.writeText(share.url);
      await sharesQuery.refetch();
      toast.success("تم إنشاء الرابط ونسخه. أرسليه فقط لمن تثقين به.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر إنشاء رابط المشاركة."); }
  };
  const revoke = async (id: number) => {
    try { await revokeShare.mutateAsync({ id }); await sharesQuery.refetch(); toast.success("تم إبطال رابط المشاركة فوراً."); } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر إبطال الرابط."); }
  };
  return <section className="surface-card page-card privacy-tools"><div className="section-header"><div><h2>مشاركة تقرير محدود</h2><p>للمشاركة الاختيارية مع الطبيبة أو مقدم الرعاية فقط.</p></div><Link2 size={21} color="var(--green)" /></div><div className="settings-group"><p>الرابط لا يكشف السجل الكامل ولا يمنح وصولاً للحساب. يحتوي على ملخص محدود، ينتهي تلقائياً، ويمكن إبطاله فوراً من هنا.</p><div className="day-actions"><button className="secondary-button" type="button" onClick={() => void create(24)} disabled={createShare.isPending}>إنشاء رابط 24 ساعة</button><button className="secondary-button" type="button" onClick={() => void create(72)} disabled={createShare.isPending}>إنشاء رابط 72 ساعة</button></div>{newShareUrl && <div className="field"><label htmlFor="new-share-url">آخر رابط تم إنشاؤه</label><div className="day-actions"><input id="new-share-url" readOnly value={newShareUrl} /><button className="secondary-button" type="button" onClick={() => void navigator.clipboard?.writeText(newShareUrl)}><Copy size={16} />نسخ</button></div></div>}</div><div className="settings-group">{sharesQuery.data?.length ? sharesQuery.data.map(share => { const isActive = !share.revokedAt && new Date(share.expiresAt).getTime() > Date.now(); return <div className="notification-card" key={share.id}><div><strong>{isActive ? "رابط مفعّل" : share.revokedAt ? "رابط مُبطل" : "رابط منتهي"}</strong><span>ينتهي: {new Date(share.expiresAt).toLocaleString("ar-EG")}</span></div>{isActive && <button className="secondary-button" type="button" onClick={() => void revoke(share.id)} disabled={revokeShare.isPending}>إبطال الآن</button>}</div>; }) : <p className="field-hint">لم تنشئي روابط مشاركة بعد.</p>}</div></section>;
}

export function DeviceLockPanel() {
  const status = api.deviceLock.status.useQuery(undefined, { enabled: true });
  const registrationOptions = api.deviceLock.registrationOptions.useMutation();
  const registrationVerify = api.deviceLock.registrationVerify.useMutation();
  const remove = api.deviceLock.remove.useMutation();
  const supported = typeof window !== "undefined" && "PublicKeyCredential" in window;
  const setup = async () => {
    if (!supported) return toast.error("قفل الجهاز غير مدعوم في هذا المتصفح. استخدمي رمز PIN كبديل.");
    try {
      const options = await registrationOptions.mutateAsync(undefined);
      const response = await startRegistration({ optionsJSON: options as never });
      await registrationVerify.mutateAsync({ response });
      await status.refetch();
      toast.success("تم تفعيل قفل الجهاز. يمكن استخدام البصمة أو قفل النظام عند فتح التطبيق.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تفعيل قفل الجهاز."); }
  };
  const disable = async () => {
    try { await remove.mutateAsync(undefined); await status.refetch(); toast.success("تمت إزالة قفل الجهاز من هذا الحساب."); } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر إزالة قفل الجهاز."); }
  };
  return <section className="surface-card page-card privacy-tools"><div className="section-header"><div><h2>قفل الجهاز</h2><p>استخدمي بصمة الوجه أو البصمة أو قفل النظام إن كان جهازكِ يدعم ذلك.</p></div><Fingerprint size={21} color="var(--green)" /></div><div className="settings-group"><p>{supported ? "يُخزّن التطبيق المفتاح العام فقط، ولا يصل إلى بصمتكِ أو رمز قفل جهازكِ." : "هذا المتصفح لا يدعم قفل الجهاز. يظل رمز PIN السريع متاحاً كبديل."}</p>{status.data?.enabled ? <div className="notification-card"><div><strong>قفل الجهاز مفعّل</strong><span>تم تسجيل {status.data.credentialCount} اعتماد/اعتمادات لهذا الحساب.</span></div><button className="secondary-button" type="button" onClick={() => void disable()} disabled={remove.isPending}>إزالة</button></div> : <button className="secondary-button" type="button" onClick={() => void setup()} disabled={!supported || registrationOptions.isPending || registrationVerify.isPending}><Fingerprint size={16} />{registrationOptions.isPending || registrationVerify.isPending ? "جارٍ الإعداد..." : "تفعيل قفل الجهاز"}</button>}</div></section>;
}

export function AppLockScreen({ onUnlock, pinEnabled }: { onUnlock: () => void; pinEnabled: boolean }) {
  const verify = api.privacyLock.verify.useMutation();
  const deviceStatus = api.deviceLock.status.useQuery(undefined, { enabled: true });
  const authenticationOptions = api.deviceLock.authenticationOptions.useMutation();
  const authenticationVerify = api.deviceLock.authenticationVerify.useMutation();
  const [pin, setPin] = useState("");
  const submit = async (event: FormEvent) => { event.preventDefault(); try { await verify.mutateAsync({ pin }); setPin(""); onUnlock(); } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر فتح التطبيق."); } };
  const unlockWithDevice = async () => {
    try {
      const options = await authenticationOptions.mutateAsync(undefined);
      const response = await startAuthentication({ optionsJSON: options as never });
      await authenticationVerify.mutateAsync({ response });
      onUnlock();
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر فتح التطبيق عبر الجهاز."); }
  };
  const deviceSupported = typeof window !== "undefined" && "PublicKeyCredential" in window;
  return <div className="tracker-app login-page" data-theme="pink" dir="rtl"><form className="surface-card login-card" onSubmit={submit}><div className="login-content"><div className="brand-mark"><KeyRound size={25} /></div><h1>التطبيق مقفل</h1><p>{deviceStatus.data?.enabled ? "استخدمي قفل الجهاز أو رمز PIN، إن كان مفعّلاً، لإظهار تفاصيلكِ الخاصة." : "أدخلي رمز القفل السريع لإظهار تفاصيلكِ الخاصة."}</p><div className="form-stack">{deviceStatus.data?.enabled && <button className="primary-button" type="button" onClick={() => void unlockWithDevice()} disabled={!deviceSupported || authenticationOptions.isPending || authenticationVerify.isPending}><Fingerprint size={16} />{authenticationOptions.isPending || authenticationVerify.isPending ? "جارٍ التحقق..." : "فتح بقفل الجهاز"}</button>}{pinEnabled && <><div className="field"><label htmlFor="unlock-pin">رمز القفل</label><input id="unlock-pin" inputMode="numeric" type="password" autoFocus value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, "").slice(0, 8))} /></div><button className="primary-button" type="submit" disabled={verify.isPending}><UnlockKeyhole size={16} />{verify.isPending ? "جارٍ الفتح..." : "فتح برمز PIN"}</button></>}</div></div></form></div>;
}
