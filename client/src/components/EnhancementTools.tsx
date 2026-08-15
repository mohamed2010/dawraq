"use client";

import { api, type PersonalSummary } from "@/lib/api";
import { Bell, CalendarClock, CheckCircle2, Contrast, Download, FileText, HeartPulse, KeyRound, ShieldCheck, Type, Upload } from "lucide-react";
import React, { ChangeEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type ReminderSettings = { period: boolean; log: boolean; products: boolean; time: string };
const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const daysAgo = (count: number) => dateKey(new Date(Date.now() - count * 86400000));

function saveDownload(name: string, value: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
}

export function AccessibilityPanel({ userId }: { userId: number }) {
  const key = `zuhaira-accessibility:${userId}`;
  const [fontScale, setFontScale] = useState<"normal" | "large" | "extra">("normal");
  const [contrast, setContrast] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem(key); const settings = stored ? JSON.parse(stored) as { fontScale?: "normal" | "large" | "extra"; contrast?: boolean } : {};
    setFontScale(settings.fontScale ?? "normal"); setContrast(Boolean(settings.contrast));
  }, [key]);
  useEffect(() => {
    document.documentElement.dataset.textScale = fontScale; document.documentElement.dataset.contrast = contrast ? "high" : "normal";
    localStorage.setItem(key, JSON.stringify({ fontScale, contrast }));
  }, [contrast, fontScale, key]);
  return <section className="surface-card page-card enhancement-panel"><div className="section-header"><div><h2>سهولة القراءة</h2><p>تفضيلات هذا الجهاز تساعدكِ على القراءة واللمس بوضوح أكبر.</p></div><Type size={21} color="var(--accent)" /></div><div className="field"><label>حجم النص</label><div className="choice-grid choice-grid-three">{(["normal", "large", "extra"] as const).map(value => <button className={fontScale === value ? "profile-choice selected" : "profile-choice"} type="button" key={value} onClick={() => setFontScale(value)}>{value === "normal" ? "عادي" : value === "large" ? "كبير" : "كبير جداً"}</button>)}</div></div><label className="toggle-row"><div><strong>تباين مرتفع</strong><span>يزيد الفرق بين النص والخلفية لتسهيل القراءة.</span></div><button type="button" className={`switch ${contrast ? "on" : ""}`} aria-label="تفعيل التباين المرتفع" onClick={() => setContrast(current => !current)}><i /></button></label></section>;
}

export function GeneralReminderPanel({ userId, nextPeriodStart }: { userId: number; nextPeriodStart: string | null }) {
  const key = `zuhaira-general-reminders:${userId}`;
  const [settings, setSettings] = useState<ReminderSettings>({ period: false, log: false, products: false, time: "09:00" });
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  useEffect(() => { const stored = localStorage.getItem(key); if (stored) setSettings(JSON.parse(stored) as ReminderSettings); if ("Notification" in window) setPermission(Notification.permission); }, [key]);
  useEffect(() => { localStorage.setItem(key, JSON.stringify(settings)); }, [key, settings]);
  useEffect(() => {
    if (permission !== "granted" || !("Notification" in window)) return;
    const notifyIfDue = () => {
      const now = new Date(); const nowMinutes = now.getHours() * 60 + now.getMinutes(); const [hour, minute] = settings.time.split(":").map(Number); const preferredMinutes = hour * 60 + minute;
      if (Math.abs(nowMinutes - preferredMinutes) > 3) return;
      const today = dateKey(now); const reminderKey = `zuhaira-general-sent:${userId}:${today}`;
      if (sessionStorage.getItem(reminderKey)) return;
      const reminders: string[] = [];
      if (settings.log) reminders.push("سجّلي متابعة اليوم إن رغبتِ");
      if (settings.period && nextPeriodStart === today) reminders.push("اليوم هو موعد الدورة المتوقع تقديرياً");
      if (settings.products && nextPeriodStart) { const prepDate = dateKey(new Date(new Date(`${nextPeriodStart}T12:00:00`).getTime() - 86400000)); if (prepDate === today) reminders.push("قد ترغبين في تجهيز منتجات الدورة"); }
      if (!reminders.length) return;
      sessionStorage.setItem(reminderKey, "1"); new Notification("تذكير من زُهيرة", { body: reminders.join(" • "), tag: reminderKey, silent: false });
    };
    const onVisibility = () => { if (document.visibilityState === "visible") notifyIfDue(); };
    notifyIfDue(); window.addEventListener("focus", notifyIfDue); document.addEventListener("visibilitychange", onVisibility);
    return () => { window.removeEventListener("focus", notifyIfDue); document.removeEventListener("visibilitychange", onVisibility); };
  }, [nextPeriodStart, permission, settings, userId]);
  const requestPermission = async () => { if (!("Notification" in window)) return toast.error("هذا المتصفح لا يدعم التنبيهات."); const result = await Notification.requestPermission(); setPermission(result); result === "granted" ? toast.success("تم تفعيل التنبيهات.") : toast.error("لم يتم منح إذن التنبيهات."); };
  const sendPreview = () => { if (permission !== "granted") return void requestPermission(); new Notification("تذكير من زُهيرة", { body: "هذا مثال لتذكير تنظيمي داخل المتصفح.", tag: "zuhaira-preview" }); };
  return <section className="surface-card page-card enhancement-panel"><div className="section-header"><div><h2>تذكيرات عامة</h2><p>تعمل عند فتح التطبيق أو عودتكِ إليه؛ لا تصل بشكل مضمون إذا كان المتصفح مغلقاً.</p></div><CalendarClock size={21} color="var(--accent)" /></div><div className="field"><label>وقت التنبيه المفضل</label><input type="time" value={settings.time} onChange={event => setSettings(current => ({ ...current, time: event.target.value }))} /></div><div className="reminder-toggle-list">{([{ key: "period", label: "الدورة المتوقعة", hint: nextPeriodStart ? `أقرب تقدير: ${nextPeriodStart}` : "يحتاج سجلاً لإظهار تقدير" }, { key: "log", label: "تسجيل متابعة اليوم", hint: "تذكير لطيف لإضافة المزاج أو الأعراض" }, { key: "products", label: "تجهيز منتجات الدورة", hint: "تنبيه تنظيمي قبل التاريخ المتوقع" }] as const).map(item => <label className="toggle-row" key={item.key}><div><strong>{item.label}</strong><span>{item.hint}</span></div><button type="button" className={`switch ${settings[item.key] ? "on" : ""}`} aria-label={item.label} onClick={() => setSettings(current => ({ ...current, [item.key]: !current[item.key] }))}><i /></button></label>)}</div><div className="day-actions"><button className="secondary-button" type="button" onClick={() => void requestPermission()} disabled={permission === "granted"}><Bell size={16} />{permission === "granted" ? "التنبيهات مفعّلة" : "تفعيل التنبيهات"}</button><button className="secondary-button" type="button" onClick={sendPreview}><CheckCircle2 size={16} />تجربة تنبيه</button></div></section>;
}

export function LifeStagePanel({ userId }: { userId: number }) {
  const key = `zuhaira-life-stage:${userId}`;
  const [stage, setStage] = useState<"cycle" | "pregnancy" | "postpartum" | "perimenopause">("cycle");
  useEffect(() => { const saved = localStorage.getItem(key); if (saved === "cycle" || saved === "pregnancy" || saved === "postpartum" || saved === "perimenopause") setStage(saved); }, [key]);
  const copy = { cycle: "متابعة الدورة والخصوبة والأعراض كما في السجل المعتاد.", pregnancy: "يمكنكِ استخدام السجل اليومي للملاحظات والمزاج، لكن لا يعتمد التطبيق للتشخيص أو متابعة الحمل الطبية.", postpartum: "سجلي الملاحظات والمزاج والراحة، وراجعي مختصة عند وجود قلق أو أعراض مستمرة بعد الولادة.", perimenopause: "يساعدكِ السجل في رؤية التغيرات مع الوقت، ولا يحدد سبب تغير الدورة أو يحتاج بديلاً عن الرعاية الطبية." }[stage];
  return <section className="surface-card page-card enhancement-panel"><div className="section-header"><div><h2>وضع المتابعة</h2><p>اختيار تنظيمي يغيّر صياغة التذكيرات والملخصات على هذا الجهاز.</p></div><HeartPulse size={21} color="var(--accent)" /></div><div className="choice-grid choice-grid-three life-stage-grid">{([ ["cycle", "الدورة"], ["pregnancy", "الحمل"], ["postpartum", "ما بعد الولادة"], ["perimenopause", "ما قبل انقطاع الطمث"] ] as const).map(([value, label]) => <button className={stage === value ? "profile-choice selected" : "profile-choice"} key={value} type="button" onClick={() => { setStage(value); localStorage.setItem(key, value); }}>{label}</button>)}</div><p className="field-hint">{copy}</p></section>;
}

function filterSummary(summary: PersonalSummary, from: string, to: string) {
  const inRange = (value: string) => (!from || value >= from) && (!to || value <= to);
  return { ...summary, cycles: summary.cycles.filter(item => inRange(item.startDate)), dailyEntries: summary.dailyEntries.filter(item => inRange(item.entryDate)), medicationDoseLogs: summary.medicationDoseLogs.filter(item => inRange(item.doseDate)) };
}

function printReport(summary: PersonalSummary, from: string, to: string) {
  const report = filterSummary(summary, from, to); const entries = report.dailyEntries;
  const lines = [`تقرير زُهيرة الشخصي`, `الفترة: ${from || "بداية السجل"} — ${to || "اليوم"}`, `الدورات: ${report.cycles.length}`, `أيام المتابعة: ${entries.length}`, `متوسط الألم: ${entries.length ? (entries.reduce((total, entry) => total + entry.painLevel, 0) / entries.length).toFixed(1) : "—"} / 4`, `قياسات الحرارة: ${entries.filter(entry => entry.basalTemperature !== null).length}`, `قياسات الوزن: ${entries.filter(entry => entry.weightKg !== null).length}`, `جرعات مؤكدة: ${report.medicationDoseLogs.length}`, "", "هذا التقرير تنظيمي شخصي وليس تشخيصاً أو وصفة علاجية."];
  const popup = window.open("", "_blank", "noopener,noreferrer"); if (!popup) return toast.error("اسمحي بفتح نافذة الطباعة لإنشاء التقرير.");
  popup.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><title>تقرير زُهيرة</title><style>body{font-family:Cairo,Arial,sans-serif;margin:32px;line-height:2;color:#28253a}h1{color:#c9265b}pre{white-space:pre-wrap;font:inherit}</style></head><body><h1>تقرير زُهيرة الشخصي</h1><pre>${lines.join("\n")}</pre><script>window.print()</script></body></html>`); popup.document.close();
}

export function ReportsAndBackupPanel() {
  const summaryQuery = api.reports.summary.useQuery(undefined, { enabled: false });
  const [from, setFrom] = useState(daysAgo(90)); const [to, setTo] = useState(dateKey(new Date())); const [passphrase, setPassphrase] = useState(""); const [verifiedBackup, setVerifiedBackup] = useState("");
  const summary = summaryQuery.data;
  const adherence = useMemo(() => { if (!summary) return null; const since = daysAgo(29); const active = summary.medications.filter(item => item.isActive); const expected = active.reduce((total, item) => total + item.reminderTimes.length * 30, 0); const taken = summary.medicationDoseLogs.filter(item => item.doseDate >= since).length; return { expected, taken, rate: expected ? Math.min(100, Math.round((taken / expected) * 100)) : null }; }, [summary]);
  const load = async () => { const result = await summaryQuery.refetch(); if (!result.data) throw new Error("تعذر تجهيز بياناتكِ."); return result.data; };
  const encryptedBackup = async () => { try { if (passphrase.length < 8) return toast.error("اختاري عبارة مرور من 8 أحرف على الأقل لحماية النسخة."); const data = await load(); const salt = crypto.getRandomValues(new Uint8Array(16)); const iv = crypto.getRandomValues(new Uint8Array(12)); const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]); const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 150000, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt"]); const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(data))); saveDownload(`zuhaira-encrypted-backup-${dateKey(new Date())}.json`, JSON.stringify({ format: "zuhaira-encrypted-v1", salt: Array.from(salt), iv: Array.from(iv), payload: Array.from(new Uint8Array(encrypted)) }), "application/json"); toast.success("تم تنزيل نسخة احتياطية مشفرة."); } catch { toast.error("تعذر تشفير النسخة الآن."); } };
  const verifyBackup = async (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; try { const content = JSON.parse(await file.text()) as { format?: string; payload?: unknown }; setVerifiedBackup(content.format === "zuhaira-encrypted-v1" && Array.isArray(content.payload) ? "تم التحقق من ملف النسخة المشفرة. احتفظي به وعبارة المرور في مكان آمن." : "هذا ليس ملف نسخة زُهيرة مشفرة صالحاً."); } catch { setVerifiedBackup("تعذر قراءة ملف النسخة."); } };
  return <section className="surface-card page-card enhancement-panel"><div className="section-header"><div><h2>تقارير ونسخ احتياطي</h2><p>اختاري فترة للتقرير، واحفظي نسخة مشفرة محلياً بعبارة مرور من اختياركِ.</p></div><FileText size={21} color="var(--accent)" /></div><div className="report-range"><div className="field"><label>من</label><input type="date" value={from} onChange={event => setFrom(event.target.value)} /></div><div className="field"><label>إلى</label><input type="date" value={to} onChange={event => setTo(event.target.value)} /></div></div><div className="day-actions"><button className="secondary-button" type="button" onClick={() => void load().then(data => printReport(data, from, to)).catch(error => toast.error(error instanceof Error ? error.message : "تعذر تجهيز التقرير."))}><FileText size={16} />تقرير للطباعة/PDF</button><button className="secondary-button" type="button" onClick={() => void load().then(data => saveDownload(`zuhaira-export-${dateKey(new Date())}.json`, JSON.stringify(filterSummary(data, from, to), null, 2), "application/json")).catch(() => toast.error("تعذر تنزيل البيانات."))}><Download size={16} />تصدير الفترة</button></div><div className="adherence-card"><strong>التزام الأدوية خلال آخر 30 يوماً</strong><span>{adherence?.rate === null ? "أضيفي دواءً نشطاً لبدء الحساب." : adherence ? `${adherence.rate}% — ${adherence.taken} جرعة مؤكدة من ${adherence.expected} مجدولة` : "حمّلي التقرير لإظهار الملخص."}</span></div><div className="settings-group"><h3>نسخة احتياطية مشفّرة</h3><p>تشفّر النسخة داخل جهازكِ قبل تنزيلها. لن يمكن فتحها بدون عبارة المرور، ولا تُرفع إلى خادم منفصل.</p><div className="field"><label>عبارة مرور النسخة</label><input type="password" minLength={8} value={passphrase} onChange={event => setPassphrase(event.target.value)} placeholder="8 أحرف أو أكثر" /></div><div className="day-actions"><button className="secondary-button" type="button" onClick={() => void encryptedBackup()}><KeyRound size={16} />تنزيل نسخة مشفرة</button><label className="secondary-button upload-label"><Upload size={16} />التحقق من ملف<input type="file" accept="application/json" onChange={verifyBackup} /></label></div>{verifiedBackup && <p className="field-hint">{verifiedBackup}</p>}</div><p className="field-hint"><ShieldCheck size={14} />لا تستوردي ملفاً من شخص آخر، ولا تشاركي عبارة المرور مع أي شخص.</p></section>;
}
