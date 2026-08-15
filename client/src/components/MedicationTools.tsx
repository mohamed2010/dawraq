"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, type MedicationInput, type MedicationRecord } from "@/lib/api";
import { Bell, BellRing, Check, Clock3, Edit3, Pill, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const todayKey = () => new Date().toLocaleDateString("en-CA");
const emptyMedication = (): MedicationInput => ({ name: "", dosage: "", notes: null, reminderTimes: ["09:00"], isActive: true });

export function BrowserMedicationReminderController({ medications, onDoseTaken }: { medications: MedicationRecord[]; onDoseTaken: (id: number, time: string) => Promise<void> }) {
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const run = () => {
      if (Notification.permission !== "granted") return;
      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const date = todayKey();
      for (const medication of medications) {
        if (!medication.isActive || !medication.reminderTimes.includes(time)) continue;
        const key = `zuhaira-reminder:${medication.id}:${date}:${time}`;
        if (sessionStorage.getItem(key)) continue;
        sessionStorage.setItem(key, "1");
        new Notification("تذكير من زُهيرة", { body: "حان وقت جرعة مسجلة. افتحي التطبيق لتأكيدها.", tag: key, silent: false });
        toast("حان الآن موعد جرعة مسجلة", { action: { label: "تم أخذها", onClick: () => void onDoseTaken(medication.id, time) } });
      }
    };
    run();
    const timer = window.setInterval(run, 15_000);
    return () => window.clearInterval(timer);
  }, [medications, onDoseTaken]);
  return null;
}

export function MedicationPanel({ medications, onRefresh }: { medications: MedicationRecord[]; onRefresh: () => Promise<unknown> }) {
  const createMedication = api.medications.create.useMutation();
  const updateMedication = api.medications.update.useMutation();
  const deleteMedication = api.medications.delete.useMutation();
  const takeDose = api.medications.takeDose.useMutation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<MedicationInput>(emptyMedication);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");

  useEffect(() => { if (typeof window !== "undefined" && "Notification" in window) setPermission(Notification.permission); }, []);
  const busy = createMedication.isPending || updateMedication.isPending || deleteMedication.isPending || takeDose.isPending;
  const activeCount = useMemo(() => medications.filter(medication => medication.isActive).length, [medications]);
  const openNew = () => { setEditingId(null); setForm(emptyMedication()); setOpen(true); };
  const openEdit = (medication: MedicationRecord) => { setEditingId(medication.id); setForm({ name: medication.name, dosage: medication.dosage, notes: medication.notes, reminderTimes: medication.reminderTimes, isActive: medication.isActive }); setOpen(true); };
  const requestPermission = async () => {
    if (!("Notification" in window)) return toast.error("هذا المتصفح لا يدعم التنبيهات.");
    const result = await Notification.requestPermission();
    setPermission(result);
    result === "granted" ? toast.success("تم تفعيل تنبيهات المتصفح.") : toast.error("لم يتم منح إذن التنبيهات.");
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.dosage.trim()) return toast.error("اكتبي اسم الدواء والجرعة كما وصفها المختص.");
    try {
      const payload = { ...form, name: form.name.trim(), dosage: form.dosage.trim(), notes: form.notes?.trim() || null, reminderTimes: [...new Set(form.reminderTimes)].sort() };
      if (editingId) await updateMedication.mutateAsync({ id: editingId, ...payload }); else await createMedication.mutateAsync(payload);
      await onRefresh(); setOpen(false); toast.success(editingId ? "تم تعديل الدواء." : "تم حفظ الدواء والتذكيرات.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر حفظ الدواء الآن."); }
  };
  const markTaken = async (id: number, scheduledTime: string) => {
    try { await takeDose.mutateAsync({ id, doseDate: todayKey(), scheduledTime }); toast.success("تم تسجيل الجرعة لهذا الوقت."); } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر تسجيل الجرعة."); }
  };
  const remove = async (id: number) => { if (!window.confirm("حذف هذا الدواء وتذكيراته؟")) return; try { await deleteMedication.mutateAsync({ id }); await onRefresh(); toast.success("تم حذف الدواء."); } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر حذف الدواء."); } };

  return <section className="surface-card page-card medication-panel"><div className="section-header"><div><h2>الأدوية والتذكيرات</h2><p>{activeCount ? `${activeCount} دواء نشط في ملفكِ الخاص` : "أضيفي دواءكِ ومواعيدكِ التي تريدين تذكّرها."}</p></div><Pill size={21} color="var(--accent)" /></div><div className="safety-callout"><ShieldAlert size={17} /><span>هذا المنبه وسيلة تنظيم فقط. أدخلي الجرعات والتوقيتات وفق ما وصفته الطبيبة أو الصيدلي، ولا تغيّري العلاج بناءً على التطبيق.</span></div><div className="notification-card"><div><strong>{permission === "granted" ? "تنبيهات المتصفح مفعّلة" : "فعّلي تنبيهات المتصفح"}</strong><span>تعمل طالما التطبيق أو المتصفح يعملان. لا تصل كتذكير مضمون بعد إغلاق المتصفح بالكامل.</span></div><button className="secondary-button" type="button" onClick={() => void requestPermission()} disabled={permission === "granted"}>{permission === "granted" ? <><BellRing size={16} />مفعّلة</> : <><Bell size={16} />تفعيل</>}</button></div><div className="section-header mt-5"><div><h3>قائمة الأدوية</h3><p>اسم الدواء والجرعة لا يظهران في نص إشعار القفل.</p></div><button className="primary-button" type="button" onClick={openNew}><Plus size={16} />إضافة دواء</button></div><div className="medication-list">{medications.length ? medications.map(medication => <article className={`medication-row ${medication.isActive ? "" : "inactive"}`} key={medication.id}><div className="medication-copy"><div className="medication-title"><h3>{medication.name}</h3>{!medication.isActive && <span className="badge">موقوف</span>}</div><p>{medication.dosage}</p>{medication.notes && <p className="medication-note">{medication.notes}</p>}<div className="dose-times">{medication.reminderTimes.map(time => <button key={time} type="button" className="dose-time" disabled={!medication.isActive || busy} onClick={() => void markTaken(medication.id, time)}><Clock3 size={13} />{time}<Check size={13} /></button>)}</div></div><div className="record-actions"><button className="mini-action" type="button" aria-label="تعديل الدواء" onClick={() => openEdit(medication)}><Edit3 size={15} /></button><button className="mini-action delete" type="button" aria-label="حذف الدواء" onClick={() => void remove(medication.id)}><Trash2 size={15} /></button></div></article>) : <div className="empty-state">لا توجد أدوية مسجلة. يمكنكِ إضافة دواء وتوقيت واحد أو أكثر للتذكير.</div>}</div><Dialog open={open} onOpenChange={setOpen}><DialogContent className="dialog-content" dir="rtl"><DialogHeader><DialogTitle>{editingId ? "تعديل الدواء" : "إضافة دواء"}</DialogTitle><DialogDescription>هذه المعلومات خاصة بحسابكِ، ولا يرسل التنبيه اسم الدواء إلى شاشة القفل.</DialogDescription></DialogHeader><form className="form-stack" onSubmit={save}><div className="field"><label>اسم الدواء</label><input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} maxLength={120} placeholder="كما هو مكتوب في الوصفة" required /></div><div className="field"><label>الجرعة أو التعليمات</label><input value={form.dosage} onChange={event => setForm(current => ({ ...current, dosage: event.target.value }))} maxLength={160} placeholder="مثال: قرص واحد بعد الإفطار" required /></div><div className="field"><label>مواعيد التذكير</label><div className="reminder-time-list">{form.reminderTimes.map((time, index) => <div key={`${time}-${index}`} className="reminder-time-input"><input type="time" value={time} onChange={event => setForm(current => ({ ...current, reminderTimes: current.reminderTimes.map((item, itemIndex) => itemIndex === index ? event.target.value : item) }))} required /><button type="button" className="mini-action delete" disabled={form.reminderTimes.length === 1} onClick={() => setForm(current => ({ ...current, reminderTimes: current.reminderTimes.filter((_, itemIndex) => itemIndex !== index) }))}><Trash2 size={14} /></button></div>)}</div>{form.reminderTimes.length < 6 && <button type="button" className="text-button" onClick={() => setForm(current => ({ ...current, reminderTimes: [...current.reminderTimes, "18:00"] }))}><Plus size={15} />إضافة توقيت آخر</button>}</div><div className="field"><label>ملاحظة خاصة <span className="font-normal">(اختياري)</span></label><textarea value={form.notes ?? ""} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} maxLength={1000} placeholder="مثال: مع الطعام" /></div><label className="toggle-row"><div><strong>تفعيل التذكيرات</strong><span>يمكنكِ إيقاف الدواء مؤقتاً دون حذفه.</span></div><button type="button" className={`switch ${form.isActive ? "on" : ""}`} aria-label="تفعيل التذكيرات" onClick={() => setForm(current => ({ ...current, isActive: !current.isActive }))}><i /></button></label><button className="primary-button" disabled={busy} type="submit"><Check size={16} />{busy ? "جارٍ الحفظ..." : editingId ? "حفظ التعديل" : "حفظ الدواء"}</button></form></DialogContent></Dialog></section>;
}
