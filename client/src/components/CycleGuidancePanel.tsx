import type { CycleStatistics } from "@shared/cycleMath";
import { Brain, CalendarHeart, CircleAlert, Flower2, HeartHandshake, ThermometerSun } from "lucide-react";
import React from "react";

type DailyEntry = { mood: "very_low" | "low" | "neutral" | "good" | "great" | "irritable" | "anxious"; painLevel: number } | null;

const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat(typeof document !== "undefined" && document.documentElement.lang === "en" ? "en-GB" : "ar-EG", { day: "numeric", month: "long" }).format(new Date(`${value}T12:00:00`)) : "—";

function phaseFor(today: string, statistics: CycleStatistics) {
  if (statistics.currentPeriodDay) return "period" as const;
  if (statistics.fertileStart && statistics.fertileEnd && today >= statistics.fertileStart && today <= statistics.fertileEnd) return "fertile" as const;
  if (statistics.ovulationDate && today < statistics.ovulationDate) return "follicular" as const;
  if (statistics.nextPeriodStart && today < statistics.nextPeriodStart) return "luteal" as const;
  return "general" as const;
}

const phaseCopy = {
  period: { title: "فترة الحيض", text: "قد يفيد إبطاء الوتيرة، والراحة، والدفء، وتسجيل ما يساعدكِ على الشعور بالراحة." },
  fertile: { title: "ضمن نافذة الخصوبة المتوقعة", text: "التوقع مبني على سجلكِ السابق؛ قد تختلف نافذة الخصوبة من دورة لأخرى." },
  follicular: { title: "قبل التبويض المتوقع", text: "هذه مرحلة تقديرية بين انتهاء الحيض وموعد التبويض المتوقع." },
  luteal: { title: "بعد التبويض المتوقع", text: "قد تظهر تغيرات مزاجية أو جسدية قبل الحيض؛ تدوين نمطكِ يساعد على ملاحظة ما يتكرر." },
  general: { title: "تتبّع شخصي", text: "أضيفي سجلاً منتظماً لتحسين تقدير الأيام القادمة تدريجياً." },
};

export function CycleGuidancePanel({ statistics, today, dailyEntry }: { statistics: CycleStatistics; today: string; dailyEntry: DailyEntry }) {
  const phase = phaseFor(today, statistics);
  const moodNeedsSupport = dailyEntry?.mood === "very_low" || dailyEntry?.mood === "low" || dailyEntry?.mood === "anxious" || dailyEntry?.mood === "irritable";
  const notablePain = (dailyEntry?.painLevel ?? 0) >= 3;
  const phaseDetail = phaseCopy[phase];

  return <section className="surface-card page-card cycle-guidance-panel">
    <div className="section-header"><div><h2>التبويض والخصوبة</h2><p>تقدير مبني على متوسط دورتكِ وسجلاتكِ السابقة فقط.</p></div><CalendarHeart size={21} color="var(--accent)" /></div>
    {statistics.ovulationDate && statistics.fertileStart && statistics.fertileEnd ? <div className="fertility-summary"><div className="fertility-highlight"><Flower2 size={19} /><div><span>موعد التبويض المتوقع</span><strong>{formatDate(statistics.ovulationDate)}</strong></div></div><div><span>نافذة الخصوبة المتوقعة</span><strong>{formatDate(statistics.fertileStart)} — {formatDate(statistics.fertileEnd)}</strong></div><div><span>حالتكِ اليوم</span><strong>{phaseDetail.title}</strong></div></div> : <div className="empty-state">أضيفي على الأقل تاريخ بداية دورة لتظهر تقديرات التبويض والخصوبة الشخصية.</div>}
    <div className="phase-note"><Flower2 size={16} /><span>{phaseDetail.text}</span></div>
    <div className="guidance-grid"><article><div className="guidance-title"><Brain size={18} /><h3>دعم المزاج اليوم</h3></div><ul>{moodNeedsSupport ? <><li>اختاري خطوة صغيرة قابلة للتنفيذ: راحة قصيرة، تنفّس ببطء، أو مشي لطيف إذا كان مريحاً لكِ.</li><li>حاولي حماية وقت النوم وتواصلي مع شخص تثقين به إن شعرتِ بأن المشاعر تثقل عليكِ.</li><li>دوّني ما شعرتِ به وما ساعدكِ؛ السجل قد يجعل الحديث مع المختصة أوضح.</li></> : <><li>النوم المنتظم، وجبة متوازنة، والحركة الخفيفة قد تساعد على دعم الطاقة والمزاج.</li><li>خصصي دقائق لهدوء بسيط، تمدد لطيف أو نشاط تستمتعين به، وسجلي أثره في المتابعة اليومية.</li></>}</ul></article><article><div className="guidance-title"><ThermometerSun size={18} /><h3>راحة عند الانزعاج</h3></div><ul><li>الدفء الموضعي أو حمام دافئ، والحركة الخفيفة أو التمدد إذا كانا مريحين، قد يساعدان بعض الأشخاص.</li><li>الراحة، الترطيب، وتقليل التوتر خطوات عامة يمكن تجربتها مع تسجيل ما يناسبكِ.</li>{notablePain && <li>سجلتِ ألماً مزعجاً أو شديداً اليوم؛ خففي المجهود وراقبي نمطه بدلاً من تجاهله.</li>}</ul></article></div>
    <div className="medical-safety"><CircleAlert size={18} /><div><strong>تنبيه مهم</strong><p>هذه إرشادات عامة وليست تشخيصاً أو وصفة. لا تعتمدي على نافذة الخصوبة لمنع الحمل أو تأكيده. اطلبي رعاية عاجلة عند ألم شديد أو مفاجئ، نزيف غزير أو غير معتاد، إغماء أو حمى، واطلبي دعماً عاجلاً إذا شعرتِ بأنكِ غير آمنة أو راودتكِ أفكار بإيذاء نفسكِ.</p></div></div>
    <p className="guidance-source"><HeartHandshake size={14} />تستند هذه التذكيرات العامة إلى إرشادات رعاية ذاتية موثوقة؛ ناقشي الأدوية أو المكملات مع طبيبة أو صيدلي، خصوصاً مع أي علاج قائم.</p>
  </section>;
}
