import type { CycleStatistics } from "@shared/cycleMath";
import { Activity, ChartNoAxesCombined, CircleAlert, Droplets, TrendingUp } from "lucide-react";
import React from "react";

type Cycle = { flowVolume?: "light" | "medium" | "heavy" };
type DailyEntry = { painLevel: number; mood: string; energyLevel?: number; basalTemperature?: number | null; weightKg?: number | null };

const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat(typeof document !== "undefined" && document.documentElement.lang === "en" ? "en-GB" : "ar-EG", { day: "numeric", month: "long" }).format(new Date(`${value}T12:00:00`)) : "—";

export function HealthPatternAlerts({ statistics, cycles, dailyEntries }: { statistics: CycleStatistics; cycles: Cycle[]; dailyEntries: DailyEntry[] }) {
  const severePainCount = dailyEntries.filter(entry => entry.painLevel >= 3).length;
  const heavyFlowCount = cycles.filter(cycle => cycle.flowVolume === "heavy").length;
  const recordedTemperatures = dailyEntries.filter(entry => entry.basalTemperature !== null && entry.basalTemperature !== undefined).length;
  const recordedWeights = dailyEntries.filter(entry => entry.weightKg !== null && entry.weightKg !== undefined).length;
  const alerts = [
    statistics.isIrregular && cycles.length >= 3 ? { icon: <TrendingUp size={17} />, title: "تباين ملحوظ في طول الدورة", text: `تراوح طول الدورات المسجلة بين ${statistics.shortestCycleLength} و${statistics.longestCycleLength} يوماً. راقبي التغير وسجلي دورات إضافية.` } : null,
    severePainCount >= 3 ? { icon: <Activity size={17} />, title: "ألم مزعج متكرر", text: `سجلتِ ألماً مزعجاً أو شديداً في ${severePainCount} أيام. قد يفيد حفظ التفاصيل ومناقشة النمط مع مختصة إذا استمر أو أثّر في حياتكِ.` } : null,
    heavyFlowCount >= 2 ? { icon: <Droplets size={17} />, title: "نزيف كثير متكرر", text: `سجلتِ كمية نزيف كثيرة في ${heavyFlowCount} دورات. لا يشخّص التطبيق السبب؛ راجعي مختصة إذا كان ذلك جديداً أو متكرراً أو مقلقاً.` } : null,
  ].filter(Boolean) as Array<{ icon: React.ReactNode; title: string; text: string }>;

  return <section className="surface-card page-card pattern-alerts"><div className="section-header"><div><h2>فهم نمطكِ</h2><p>ملخص شخصي من سجلاتكِ، وليس تشخيصاً طبياً.</p></div><ChartNoAxesCombined size={21} color="var(--accent)" /></div><div className="pattern-summary"><div><span>أقصر دورة</span><strong>{statistics.shortestCycleLength ? `${statistics.shortestCycleLength} يوم` : "سجلات أكثر مطلوبة"}</strong></div><div><span>أطول دورة</span><strong>{statistics.longestCycleLength ? `${statistics.longestCycleLength} يوم` : "سجلات أكثر مطلوبة"}</strong></div><div><span>توقع الدورة</span><strong>{statistics.predictionRangeStart ? `${formatDate(statistics.predictionRangeStart)} — ${formatDate(statistics.predictionRangeEnd)}` : "أضيفي أول سجل"}</strong></div></div><div className="metric-note">سجلات القياسات الاختيارية: {recordedTemperatures} حرارة أساسية، {recordedWeights} وزن. ستظهر فائدتها مع إضافة ملاحظات متعددة عبر الوقت.</div>{alerts.length ? <div className="pattern-alert-list">{alerts.map(alert => <div className="pattern-alert" key={alert.title}>{alert.icon}<div><strong>{alert.title}</strong><p>{alert.text}</p></div></div>)}</div> : <div className="empty-state">أضيفي دورات ومتابعات يومية لتظهر الملاحظات الشخصية تدريجياً.</div>}<div className="medical-safety compact-safety"><CircleAlert size={17} /><div><strong>متى تطلبين مساعدة؟</strong><p>اطلبي تقييماً عاجلاً عند ألم شديد أو مفاجئ، نزيف غزير أو غير معتاد، إغماء أو حمى. ولا يفسّر التطبيق القياسات أو الاختبارات كتشخيص.</p></div></div></section>;
}
