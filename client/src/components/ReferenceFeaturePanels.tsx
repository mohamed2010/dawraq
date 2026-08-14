import { Activity, BarChart3, Check, HeartPulse, Pencil, Plus, Trash2 } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

type MoodValue = "very_low" | "low" | "neutral" | "good" | "great" | "irritable" | "anxious";
type RelationshipStatus = "single" | "married";
type PregnancyStatus = "not_pregnant" | "pregnant" | "not_sure";

type DailyEntry = { id: number; entryDate: string; mood: MoodValue; painLevel: number; symptoms: string[]; notes: string | null };
type Cycle = { id: number; startDate: string; endDate: string | null };

const moodOptions: { value: MoodValue; label: string; emoji: string }[] = [
  { value: "very_low", label: "مرهقة", emoji: "😣" },
  { value: "low", label: "منخفض", emoji: "😕" },
  { value: "neutral", label: "متوازن", emoji: "😐" },
  { value: "good", label: "جيد", emoji: "🙂" },
  { value: "great", label: "ممتاز", emoji: "😄" },
  { value: "irritable", label: "متوترة", emoji: "😤" },
  { value: "anxious", label: "قلقة", emoji: "😟" },
];
const symptomOptions = ["تقلصات", "صداع", "انتفاخ", "إرهاق", "غثيان", "ألم الثدي", "تغير الشهية", "تقلبات مزاجية", "ألم الظهر", "حساسية"];
const painLabels = ["لا يوجد", "خفيف", "متوسط", "مزعج", "شديد"];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

export function DailyHealthPanel({ entryDate, entry, onSave, onDelete, busy }: {
  entryDate: string;
  entry: DailyEntry | null;
  onSave: (input: { entryDate: string; mood: MoodValue; painLevel: number; symptoms: string[]; notes: string | null }) => Promise<void>;
  onDelete: (entry: DailyEntry) => void;
  busy: boolean;
}) {
  const [mood, setMood] = useState<MoodValue>(entry?.mood ?? "neutral");
  const [painLevel, setPainLevel] = useState(entry?.painLevel ?? 0);
  const [symptoms, setSymptoms] = useState<string[]>(entry?.symptoms ?? []);
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [editing, setEditing] = useState(!entry);

  useEffect(() => {
    setMood(entry?.mood ?? "neutral");
    setPainLevel(entry?.painLevel ?? 0);
    setSymptoms(entry?.symptoms ?? []);
    setNotes(entry?.notes ?? "");
    setEditing(!entry);
  }, [entry, entryDate]);

  const toggleSymptom = (symptom: string) => setSymptoms(current => current.includes(symptom) ? current.filter(item => item !== symptom) : [...current, symptom]);
  const selectedMood = moodOptions.find(option => option.value === mood);

  return <section className="surface-card page-card reference-panel">
    <div className="section-header"><div><h2>متابعة يومكِ الموسعة</h2><p>{formatDate(entryDate)}</p></div>{entry && !editing && <span className={`mood-pill mood-${mood}`}>{selectedMood?.emoji} {selectedMood?.label}</span>}</div>
    {!editing && entry ? <>
      <div className="health-summary"><span><Activity size={15} />الألم: {painLabels[entry.painLevel] ?? "غير محدد"}</span><span><HeartPulse size={15} />{entry.symptoms.length ? entry.symptoms.join("، ") : "لا توجد أعراض مسجلة"}</span></div>
      {entry.notes && <p className="daily-panel-copy">ملاحظتكِ: {entry.notes}</p>}
      <div className="day-actions"><button className="secondary-button" onClick={() => setEditing(true)}><Pencil size={15} />تعديل متابعة اليوم</button><button className="mini-action delete" onClick={() => onDelete(entry)} aria-label="حذف متابعة اليوم"><Trash2 size={15} /></button></div>
    </> : <div className="health-editor">
      <div className="field"><label>كيف كان مزاجكِ؟</label><div className="mood-grid mood-grid-wide">{moodOptions.map(option => <button type="button" key={option.value} className={`mood-choice ${mood === option.value ? "selected" : ""}`} onClick={() => setMood(option.value)}><span>{option.emoji}</span>{option.label}</button>)}</div></div>
      <div className="field"><label>شدة الألم</label><div className="pain-scale">{painLabels.map((label, index) => <button type="button" key={label} className={`pain-choice ${painLevel === index ? "selected" : ""}`} onClick={() => setPainLevel(index)}><b>{index}</b><span>{label}</span></button>)}</div></div>
      <div className="field"><label>أعراض أخرى <span className="font-normal">(اختياري)</span></label><div className="symptom-grid">{symptomOptions.map(symptom => <button type="button" key={symptom} className={`symptom-choice symptom-button ${symptoms.includes(symptom) ? "selected" : ""}`} onClick={() => toggleSymptom(symptom)}>{symptoms.includes(symptom) && <Check size={14} />}{symptom}</button>)}</div></div>
      <div className="field"><label>ملاحظة قصيرة <span className="font-normal">(اختياري)</span></label><textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="أي شيء تحبين تذكره عن اليوم؟" maxLength={1000} /></div>
      <div className="day-actions"><button className="primary-button" disabled={busy} onClick={() => void onSave({ entryDate, mood, painLevel, symptoms, notes: notes.trim() || null })}>{busy ? "جارٍ الحفظ..." : <><Check size={16} />حفظ متابعة اليوم</>}</button>{entry && <button className="secondary-button" onClick={() => setEditing(false)}>إلغاء</button>}</div>
    </div>}
  </section>;
}

export function ProfileHealthPanel({ profile, onSave, busy }: {
  profile: { typicalBleedingDays: number; relationshipStatus: RelationshipStatus; pregnancyStatus: PregnancyStatus };
  onSave: (changes: { typicalBleedingDays: number; relationshipStatus: RelationshipStatus; pregnancyStatus: PregnancyStatus }) => Promise<void>;
  busy: boolean;
}) {
  const [bleedingDays, setBleedingDays] = useState(profile.typicalBleedingDays);
  const [relationship, setRelationship] = useState<RelationshipStatus>(profile.relationshipStatus);
  const [pregnancy, setPregnancy] = useState<PregnancyStatus>(profile.pregnancyStatus);
  useEffect(() => { setBleedingDays(profile.typicalBleedingDays); setRelationship(profile.relationshipStatus); setPregnancy(profile.pregnancyStatus); }, [profile]);

  return <section className="surface-card page-card reference-panel profile-health-panel">
    <div className="section-header"><div><h2>تفضيلات المتابعة</h2><p>تساعد هذه الاختيارات على تخصيص الرسائل والملخصات لكِ فقط.</p></div></div>
    <div className="form-stack">
      <div className="field"><label>مدة الحيض المعتادة (بالأيام)</label><input type="number" min="1" max="14" value={bleedingDays} onChange={event => setBleedingDays(Number(event.target.value))} /></div>
      <div className="field"><label>الحالة الاجتماعية <span className="font-normal">(اختياري)</span></label><div className="choice-grid"><button type="button" className={relationship === "single" ? "profile-choice selected" : "profile-choice"} onClick={() => setRelationship("single")}>عزباء</button><button type="button" className={relationship === "married" ? "profile-choice selected" : "profile-choice"} onClick={() => setRelationship("married")}>متزوجة</button></div></div>
      <div className="field"><label>وضع المتابعة الحالي <span className="font-normal">(اختياري)</span></label><div className="choice-grid choice-grid-three"><button type="button" className={pregnancy === "not_pregnant" ? "profile-choice selected" : "profile-choice"} onClick={() => setPregnancy("not_pregnant")}>متابعة الدورة</button><button type="button" className={pregnancy === "pregnant" ? "profile-choice selected" : "profile-choice"} onClick={() => setPregnancy("pregnant")}>حامل</button><button type="button" className={pregnancy === "not_sure" ? "profile-choice selected" : "profile-choice"} onClick={() => setPregnancy("not_sure")}>غير متأكدة</button></div><span className="field-hint">عند اختيار «حامل» سنوقف تنبؤات الحيض فقط، ولن نقدّم إرشادات أو تشخيصاً للحمل.</span></div>
      <button className="secondary-button" disabled={busy} onClick={() => void onSave({ typicalBleedingDays: bleedingDays, relationshipStatus: relationship, pregnancyStatus: pregnancy })}>حفظ تفضيلات المتابعة</button>
    </div>
  </section>;
}

export function ReferenceStatsPanel({ cycles, dailyEntries }: { cycles: Cycle[]; dailyEntries: DailyEntry[] }) {
  const [range, setRange] = useState<"3" | "6" | "all">("all");
  const stats = useMemo(() => {
    const now = new Date();
    const cutoff = range === "all" ? "" : new Date(now.getFullYear(), now.getMonth() - Number(range), now.getDate()).toISOString().slice(0, 10);
    const visibleCycles = cycles.filter(cycle => !cutoff || cycle.startDate >= cutoff);
    const visibleEntries = dailyEntries.filter(entry => !cutoff || entry.entryDate >= cutoff);
    const averagePain = visibleEntries.length ? (visibleEntries.reduce((sum, entry) => sum + entry.painLevel, 0) / visibleEntries.length).toFixed(1) : "—";
    const symptomCounts = visibleEntries.flatMap(entry => entry.symptoms).reduce<Record<string, number>>((acc, symptom) => ({ ...acc, [symptom]: (acc[symptom] ?? 0) + 1 }), {});
    const moodCounts = visibleEntries.reduce<Record<string, number>>((acc, entry) => ({ ...acc, [entry.mood]: (acc[entry.mood] ?? 0) + 1 }), {});
    const topSymptoms = Object.entries(symptomCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { visibleCycles, visibleEntries, averagePain, moodCounts, topSymptoms };
  }, [cycles, dailyEntries, range]);
  const maxSymptom = Math.max(1, ...stats.topSymptoms.map(([, count]) => count));

  return <section className="surface-card page-card reference-panel insight-panel">
    <div className="section-header"><div><h2>إحصاءاتكِ</h2><p>ملخص مرئي مبني على ما سجلتِه فعلاً، بلا افتراضات.</p></div><BarChart3 size={21} color="var(--accent)" /></div>
    <div className="filter-buttons"><button className={range === "3" ? "active" : ""} onClick={() => setRange("3")}>آخر ٣ أشهر</button><button className={range === "6" ? "active" : ""} onClick={() => setRange("6")}>آخر ٦ أشهر</button><button className={range === "all" ? "active" : ""} onClick={() => setRange("all")}>كل السجل</button></div>
    {!stats.visibleCycles.length && !stats.visibleEntries.length ? <div className="empty-state">أضيفي دورات أو متابعات يومية لتظهر الإحصاءات تدريجياً.</div> : <><div className="insight-summary"><div><span>دورات محفوظة</span><strong>{stats.visibleCycles.length}</strong></div><div><span>أيام متابعة</span><strong>{stats.visibleEntries.length}</strong></div><div><span>متوسط الألم</span><strong>{stats.averagePain}<small> / 4</small></strong></div></div><div className="insight-grid"><div className="insight-box"><h3>المزاج المسجل</h3>{moodOptions.filter(option => stats.moodCounts[option.value]).map(option => <div className="insight-row" key={option.value}><span>{option.emoji} {option.label}</span><b>{stats.moodCounts[option.value]}</b></div>)}{!Object.keys(stats.moodCounts).length && <p>لا يوجد مزاج مسجل بعد.</p>}</div><div className="insight-box"><h3>الأعراض المتكررة</h3>{stats.topSymptoms.map(([symptom, count]) => <div className="symptom-bar" key={symptom}><div><span>{symptom}</span><b>{count}</b></div><i><em style={{ width: `${(count / maxSymptom) * 100}%` }} /></i></div>)}{!stats.topSymptoms.length && <p>لا توجد أعراض مسجلة بعد.</p>}</div></div></>}
  </section>;
}
