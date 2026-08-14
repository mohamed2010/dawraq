import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { addCalendarDays, calculateCycleStatistics, dateKey, daysInRange, type CycleRecordForStats } from "@shared/cycleMath";
import { Activity, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, CircleHelp, CloudOff, Droplets, EyeOff, Flower2, HeartPulse, LogIn, LogOut, MessageCircle, Moon, Pencil, Plus, Send, Settings, ShieldCheck, Sparkles, Trash2, UserRound, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Tab = "home" | "records" | "calendar" | "chat" | "settings";
type ThemeName = "light" | "dark" | "pink" | "purple";
type CycleRow = CycleRecordForStats & { symptoms: string[]; notes: string | null };
type RecordFormState = { id: number | null; startDate: string; endDate: string; symptoms: string[]; notes: string };
type ChatMessage = { id: number; role: "assistant" | "user"; text: string };
type ProfileData = { displayName: string; averageCycleLength: number; theme: ThemeName; stealthMode: number; onboardingCompleted: number };

const symptomOptions = ["تقلصات", "صداع", "انتفاخ", "تقلبات مزاجية", "حب الشباب", "إرهاق"];
const themes: { value: ThemeName; label: string; className: string }[] = [
  { value: "light", label: "فاتح", className: "" },
  { value: "dark", label: "داكن", className: "dark" },
  { value: "pink", label: "وردي", className: "pink" },
  { value: "purple", label: "بنفسجي", className: "purple" },
];
const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const weekdays = ["الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"];

const formatDate = (value: string | null) => value
  ? new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00`))
  : "غير متاح";

function emptyRecordForm(): RecordFormState {
  return { id: null, startDate: dateKey(new Date()), endDate: "", symptoms: [], notes: "" };
}

function replyFor(question: string) {
  const normalized = question.trim().toLowerCase();
  if (/تأخر|متأخر|معاد/.test(normalized)) return "قد يحدث التأخر بسبب التوتر أو تغيرات الوزن أو النوم أو الحمل أو أسباب هرمونية. إذا كان هناك احتمال حمل أو استمر التأخر، استخدمي اختباراً مناسباً وتواصلي مع طبيبة. الألم الشديد أو النزيف غير المعتاد يحتاج تقييماً عاجلاً.";
  if (/تبويض|خصوب|حمل/.test(normalized)) return "نافذة الخصوبة هنا تقدير مبني على السجلات السابقة وليست وسيلة مؤكدة لمنع الحمل أو حدوثه. تتغير الإباضة من دورة لأخرى، لذلك استشيري مختصة عند التخطيط للحمل أو لتجنب الحمل.";
  if (/ألم|مغص|صداع|نزيف|إفراز/.test(normalized)) return "الأعراض الخفيفة قد ترافق الدورة، ويمكن أن يساعد الراحة والترطيب وتدوين النمط. إذا كان الألم شديداً أو مفاجئاً، أو النزيف غزيراً أو مختلفاً عن المعتاد، أو ظهرت حمى أو دوار؛ اطلبي رعاية طبية.";
  return "أفهم سؤالك. هذا المساعد يقدم إرشادات عامة فقط ولا يمكنه تشخيص أي حالة. يمكنكِ تدوين الأعراض ومواعيد الدورة، واستشارة طبيبة عند وجود قلق أو تغير مستمر.";
}

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const profileQuery = trpc.profile.get.useQuery(undefined, { enabled: isAuthenticated });
  const cyclesQuery = trpc.cycles.list.useQuery(undefined, { enabled: isAuthenticated });
  const saveProfile = trpc.profile.save.useMutation();
  const createCycle = trpc.cycles.create.useMutation();
  const updateCycle = trpc.cycles.update.useMutation();
  const deleteCycle = trpc.cycles.delete.useMutation();
  const [tab, setTab] = useState<Tab>("home");
  const [recordOpen, setRecordOpen] = useState(false);
  const [recordForm, setRecordForm] = useState<RecordFormState>(emptyRecordForm);
  const [deleteTarget, setDeleteTarget] = useState<CycleRow | null>(null);
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(dateKey(new Date()));
  const [settingsName, setSettingsName] = useState("");
  const [settingsCycleLength, setSettingsCycleLength] = useState(28);
  const [onboardingName, setOnboardingName] = useState("");
  const [onboardingCycleLength, setOnboardingCycleLength] = useState(28);
  const [onboardingLastPeriod, setOnboardingLastPeriod] = useState(dateKey(new Date()));
  const [onboardingEndDate, setOnboardingEndDate] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{ id: 1, role: "assistant", text: "أهلاً بكِ. اسأليني عن متابعة الدورة أو الأعراض أو الخصوبة، وسأقدم إرشادات عامة تعمل دون اتصال." }]);

  const profile = profileQuery.data;
  const cycles = (cyclesQuery.data ?? []) as CycleRow[];
  const today = dateKey(new Date());
  const statistics = useMemo(() => calculateCycleStatistics(cycles, profile?.averageCycleLength ?? 28, today), [cycles, profile?.averageCycleLength, today]);
  const isBusy = saveProfile.isPending || createCycle.isPending || updateCycle.isPending || deleteCycle.isPending;

  useEffect(() => {
    if (!profile) return;
    setSettingsName(profile.displayName);
    setSettingsCycleLength(profile.averageCycleLength);
  }, [profile]);

  useEffect(() => {
    document.documentElement.dataset.theme = profile?.theme ?? "pink";
  }, [profile?.theme]);

  const refreshData = async () => {
    await Promise.all([profileQuery.refetch(), cyclesQuery.refetch()]);
  };

  const saveCurrentProfile = async (changes: Partial<{ displayName: string; averageCycleLength: number; theme: ThemeName; stealthMode: boolean; onboardingCompleted: boolean }>) => {
    if (!profile) return;
    try {
      await saveProfile.mutateAsync({
        displayName: changes.displayName ?? profile.displayName,
        averageCycleLength: changes.averageCycleLength ?? profile.averageCycleLength,
        theme: changes.theme ?? profile.theme,
        stealthMode: changes.stealthMode ?? Boolean(profile.stealthMode),
        onboardingCompleted: changes.onboardingCompleted ?? Boolean(profile.onboardingCompleted),
      });
      await profileQuery.refetch();
    } catch {
      toast.error("تعذر حفظ الإعدادات الآن.");
    }
  };

  const finishOnboarding = async (event: FormEvent) => {
    event.preventDefault();
    if (!onboardingName.trim()) return toast.error("اكتبي الاسم الذي تريدين ظهوره في التطبيق.");
    if (onboardingEndDate && onboardingEndDate < onboardingLastPeriod) return toast.error("تاريخ النهاية لا يمكن أن يسبق تاريخ البداية.");
    try {
      await saveProfile.mutateAsync({ displayName: onboardingName.trim(), averageCycleLength: onboardingCycleLength, theme: "pink", stealthMode: false, onboardingCompleted: true });
      await createCycle.mutateAsync({ startDate: onboardingLastPeriod, endDate: onboardingEndDate || null, symptoms: [], notes: "بداية متابعة زُهيرة" });
      await refreshData();
      toast.success("تم تجهيز ملفكِ الخاص بنجاح.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تجهيز الملف الآن.");
    }
  };

  const openNewRecord = () => { setRecordForm(emptyRecordForm()); setRecordOpen(true); };
  const openEditRecord = (record: CycleRow) => {
    setRecordForm({ id: record.id, startDate: record.startDate, endDate: record.endDate ?? "", symptoms: record.symptoms, notes: record.notes ?? "" });
    setRecordOpen(true);
  };
  const closeOngoingRecord = (record: CycleRow) => {
    setRecordForm({ id: record.id, startDate: record.startDate, endDate: today, symptoms: record.symptoms, notes: record.notes ?? "" });
    setRecordOpen(true);
  };
  const toggleSymptom = (symptom: string) => setRecordForm(current => ({ ...current, symptoms: current.symptoms.includes(symptom) ? current.symptoms.filter(item => item !== symptom) : [...current.symptoms, symptom] }));
  const saveRecord = async (event: FormEvent) => {
    event.preventDefault();
    if (recordForm.endDate && recordForm.endDate < recordForm.startDate) return toast.error("تاريخ النهاية لا يمكن أن يسبق البداية.");
    try {
      const payload = { startDate: recordForm.startDate, endDate: recordForm.endDate || null, symptoms: recordForm.symptoms, notes: recordForm.notes.trim() || null };
      if (recordForm.id) await updateCycle.mutateAsync({ id: recordForm.id, ...payload });
      else await createCycle.mutateAsync(payload);
      setRecordOpen(false);
      await cyclesQuery.refetch();
      toast.success(recordForm.id ? "تم تعديل السجل." : "تم حفظ سجل الدورة.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر حفظ السجل الآن.");
    }
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCycle.mutateAsync({ id: deleteTarget.id });
      setDeleteTarget(null);
      await cyclesQuery.refetch();
      toast.success("تم حذف السجل.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر حذف السجل.");
    }
  };
  const saveSettings = async (event: FormEvent) => {
    event.preventDefault();
    if (!settingsName.trim()) return toast.error("الاسم مطلوب.");
    await saveCurrentProfile({ displayName: settingsName.trim(), averageCycleLength: settingsCycleLength });
    toast.success("تم حفظ الملف الشخصي.");
  };
  const sendChat = (event: FormEvent) => {
    event.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    setChatMessages(current => [...current, { id: Date.now(), role: "user", text }, { id: Date.now() + 1, role: "assistant", text: replyFor(text) }]);
    setChatInput("");
  };

  if (loading || (isAuthenticated && (profileQuery.isLoading || cyclesQuery.isLoading))) {
    return <div className="tracker-app loading-screen"><Activity className="animate-pulse" size={30} /></div>;
  }
  if (!isAuthenticated) return <LoginPage />;
  if (profileQuery.isError || cyclesQuery.isError) return <ProtectedDataError onRetry={refreshData} />;
  if (!profile?.onboardingCompleted) return <OnboardingPage onSubmit={finishOnboarding} name={onboardingName} setName={setOnboardingName} cycleLength={onboardingCycleLength} setCycleLength={setOnboardingCycleLength} lastPeriod={onboardingLastPeriod} setLastPeriod={setOnboardingLastPeriod} endDate={onboardingEndDate} setEndDate={setOnboardingEndDate} busy={isBusy} />;
  if (profile.stealthMode) return <StealthPage onReturn={() => saveCurrentProfile({ stealthMode: false })} busy={isBusy} />;

  const ongoingRecord = cycles.find(record => !record.endDate) ?? null;
  const periodDays = new Set(cycles.flatMap(record => daysInRange(record.startDate, record.endDate ?? today)));
  const fertileDays = new Set(statistics.fertileStart && statistics.fertileEnd ? daysInRange(statistics.fertileStart, statistics.fertileEnd) : []);

  return (
    <div className="tracker-app" data-theme={profile.theme} dir="rtl">
      <div className="app-shell">
        <header className="topbar">
          <div className="brand"><div className="brand-mark"><Flower2 size={23} /></div><div><h1>زُهيرة</h1><p>مساحتكِ الخاصة لمتابعة دورتكِ</p></div></div>
          <button className="icon-button" aria-label="فتح الإعدادات" onClick={() => setTab("settings")}><Settings size={19} /></button>
        </header>
        {tab === "home" && <HomeTab profileName={profile.displayName} statistics={statistics} ongoingRecord={ongoingRecord} onAdd={openNewRecord} onCloseOngoing={closeOngoingRecord} onRecords={() => setTab("records")} />}
        {tab === "records" && <RecordsTab cycles={cycles} onAdd={openNewRecord} onEdit={openEditRecord} onDelete={setDeleteTarget} onCloseOngoing={closeOngoingRecord} />}
        {tab === "calendar" && <CalendarTab cursor={monthCursor} setCursor={setMonthCursor} selectedDay={selectedDay} setSelectedDay={setSelectedDay} periodDays={periodDays} fertileDays={fertileDays} cycles={cycles} today={today} />}
        {tab === "chat" && <ChatTab messages={chatMessages} input={chatInput} setInput={setChatInput} onSubmit={sendChat} />}
        {tab === "settings" && <SettingsTab name={settingsName} setName={setSettingsName} cycleLength={settingsCycleLength} setCycleLength={setSettingsCycleLength} profile={profile} latestRecord={cycles[0] ?? null} onSubmit={saveSettings} onTheme={theme => saveCurrentProfile({ theme })} onStealth={() => saveCurrentProfile({ stealthMode: true })} onEditLatest={() => { if (cycles[0]) { openEditRecord(cycles[0]); } else { openNewRecord(); } }} onLogout={logout} busy={isBusy} />}
      </div>
      <Navigation active={tab} onChange={setTab} />
      <RecordDialog open={recordOpen} onOpenChange={setRecordOpen} form={recordForm} setForm={setRecordForm} onToggleSymptom={toggleSymptom} onSubmit={saveRecord} busy={isBusy} />
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="dialog-content" dir="rtl"><AlertDialogHeader><AlertDialogTitle>حذف سجل الدورة؟</AlertDialogTitle><AlertDialogDescription>سيُحذف سجل {deleteTarget ? formatDate(deleteTarget.startDate) : ""} نهائياً من ملفكِ الخاص. لا يمكن التراجع عن ذلك.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-rose-600 hover:bg-rose-700">حذف السجل</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LoginPage() { return <div className="tracker-app login-page" data-theme="pink"><div className="surface-card login-card"><div className="login-content"><div className="brand-mark"><Flower2 size={25} /></div><h1>متابعة دورتكِ، بخصوصية وهدوء.</h1><p>زُهيرة تحفظ ملف كل مستخدمة بشكل منفصل، وتمنحكِ سجلاً واضحاً وتوقعات مبنية على بياناتكِ.</p><div className="login-perks"><span><i><ShieldCheck size={15} /></i>بيانات منفصلة ومحميّة لكل حساب</span><span><i><CalendarDays size={15} /></i>سجل، تقويم، وتوقعات في مكان واحد</span><span><i><EyeOff size={15} /></i>وضع تخفي بواجهة محايدة عند الحاجة</span></div><button className="primary-button w-full" onClick={() => startLogin()}><LogIn size={17} />تسجيل الدخول بأمان</button><p className="mt-4 text-center text-[.62rem]">بالتسجيل، ستتمكنين من الوصول إلى بياناتكِ من أجهزتكِ المختلفة.</p></div></div></div>; }

function ProtectedDataError({ onRetry }: { onRetry: () => Promise<unknown> }) { return <div className="tracker-app login-page" data-theme="pink"><div className="surface-card login-card"><div className="login-content"><div className="brand-mark"><CloudOff size={25} /></div><h1>تعذر فتح بياناتكِ الآن</h1><p>لم نتمكن من الوصول إلى ملفكِ الخاص أو سجلات الدورة. لم يتم تعديل أو حذف أي بيانات.</p><button className="primary-button w-full mt-6" onClick={() => void onRetry()}><Activity size={17} />إعادة المحاولة</button></div></div></div>; }

function OnboardingPage(props: { onSubmit: (event: FormEvent) => void; name: string; setName: (value: string) => void; cycleLength: number; setCycleLength: (value: number) => void; lastPeriod: string; setLastPeriod: (value: string) => void; endDate: string; setEndDate: (value: string) => void; busy: boolean }) { return <div className="tracker-app onboarding-page" data-theme="pink"><form className="surface-card onboarding-card" onSubmit={props.onSubmit}><div className="brand-mark"><Sparkles size={24} /></div><h1 className="mt-4 text-[1.35rem] font-extrabold">لنجهز ملفكِ الخاص</h1><p className="mt-2 text-[.72rem] leading-7" style={{ color: "var(--muted)" }}>هذه الخطوات الأولى تساعدنا على إظهار تقديرات مناسبة. يمكنكِ تعديل كل البيانات لاحقاً من الإعدادات.</p><div className="form-stack"><div className="field"><label htmlFor="onboarding-name">الاسم الذي تفضلينه</label><input id="onboarding-name" value={props.name} onChange={event => props.setName(event.target.value)} placeholder="مثال: سارة" required /></div><div className="field"><label htmlFor="onboarding-cycle">متوسط طول الدورة (بالأيام)</label><input id="onboarding-cycle" type="number" min="20" max="45" value={props.cycleLength} onChange={event => props.setCycleLength(Number(event.target.value))} required /></div><div className="field"><label htmlFor="onboarding-start">أول يوم من آخر حيض</label><input id="onboarding-start" type="date" value={props.lastPeriod} max={dateKey(new Date())} onChange={event => props.setLastPeriod(event.target.value)} required /></div><div className="field"><label htmlFor="onboarding-end">آخر يوم للحيض <span className="font-normal">(اختياري)</span></label><input id="onboarding-end" type="date" value={props.endDate} min={props.lastPeriod} max={dateKey(new Date())} onChange={event => props.setEndDate(event.target.value)} /><span className="field-hint">اتركيه فارغاً إذا كان الحيض ما زال مستمراً؛ يمكنكِ إضافته لاحقاً.</span></div><button className="primary-button" disabled={props.busy} type="submit"><CheckCircle2 size={17} />{props.busy ? "جارٍ الحفظ..." : "إكمال الإعداد"}</button></div></form></div>; }

function StealthPage({ onReturn, busy }: { onReturn: () => void; busy: boolean }) { return <div className="stealth-page" dir="rtl"><div className="stealth-card"><div className="stealth-icon"><CloudOff size={27} /></div><h1>مساحة هادئة</h1><p>خذي وقتاً قصيراً للتركيز والتنفس. لا توجد تفاصيل شخصية معروضة في هذه الشاشة.</p><button className="secondary-button" onClick={onReturn} disabled={busy}><LockKeyholeIcon />العودة</button></div></div>; }
function LockKeyholeIcon() { return <ShieldCheck size={17} />; }

function HomeTab({ profileName, statistics, ongoingRecord, onAdd, onCloseOngoing, onRecords }: { profileName: string; statistics: ReturnType<typeof calculateCycleStatistics>; ongoingRecord: CycleRow | null; onAdd: () => void; onCloseOngoing: (record: CycleRow) => void; onRecords: () => void }) {
  return <><section className="surface-card hero"><div className="eyebrow"><Sparkles size={14} />مرحباً {profileName}</div><h2>{ongoingRecord ? `اليوم ${statistics.currentPeriodDay ?? 1} من الحيض الجاري` : "متابعة بسيطة تساعدكِ على فهم نمط دورتكِ"}</h2><p>التوقعات تتعلم من سجلاتكِ السابقة وتبقى تقديرية دائماً.</p></section><div className="stat-grid"><StatCard icon={<CalendarDays size={15} />} label="الدورة القادمة" value={formatDate(statistics.nextPeriodStart)} hint={`متوسط الدورة: ${statistics.averageCycleLength} يوم`} /><StatCard icon={<Flower2 size={15} />} label="نافذة الخصوبة" value={statistics.fertileStart ? `${formatDate(statistics.fertileStart)} — ${formatDate(statistics.fertileEnd)}` : "أضيفي سجلاً للبدء"} hint="توقع تقريبي وليس تشخيصاً" /><StatCard icon={<Droplets size={15} />} label="متوسط الحيض" value={statistics.averagePeriodDuration ? `${statistics.averagePeriodDuration} أيام` : "تحتاج سجلات مكتملة"} hint="يُحسب من الدورات المنتهية" /><StatCard icon={<Activity size={15} />} label="موعد الإباضة" value={formatDate(statistics.ovulationDate)} hint="قبل الدورة المتوقعة بـ14 يوماً" /></div><div className="main-layout"><section className="section"><div className="section-header"><div><h2>آخر حالة</h2><p>إدارة سريعة لسجل الحيض</p></div></div>{ongoingRecord ? <div className="surface-card ongoing-card"><div className="ongoing-status"><div className="status-orb"><Droplets size={19} /></div><div><h3>حيض مستمر منذ {formatDate(ongoingRecord.startDate)}</h3><p>المدة حتى الآن {statistics.currentPeriodDay ?? 1} أيام. عند انتهائه، أضيفي تاريخ النهاية ليُحتسب متوسط المدة بدقة.</p></div></div><button className="secondary-button" onClick={() => onCloseOngoing(ongoingRecord)}><CheckCircle2 size={16} />إضافة تاريخ النهاية</button></div> : <div className="surface-card ongoing-card"><div className="ongoing-status"><div className="status-orb"><Plus size={19} /></div><div><h3>لا يوجد حيض مستمر</h3><p>يمكنكِ تسجيل أول يوم الآن أو إضافة دورة سابقة مكتملة من السجل.</p></div></div><button className="primary-button" onClick={onAdd}><Plus size={16} />تسجيل دورة</button></div>}</section><section className="section"><div className="section-header"><div><h2>السجل</h2><p>راجعي الدورات السابقة</p></div><button className="text-button" onClick={onRecords}>عرض السجل</button></div><div className="surface-card p-3"><p className="m-0 text-[.68rem] leading-7" style={{ color: "var(--muted)" }}>كلما أضفتِ دورات مكتملة أكثر، أصبحت توقعات متوسط الدورة ومدة الحيض أكثر ارتباطاً بسجلكِ الشخصي.</p></div></section></div></>;
}
function StatCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) { return <div className="surface-card stat-card"><span className="stat-label">{icon}{label}</span><strong>{value}</strong><small>{hint}</small></div>; }

function RecordsTab({ cycles, onAdd, onEdit, onDelete, onCloseOngoing }: { cycles: CycleRow[]; onAdd: () => void; onEdit: (record: CycleRow) => void; onDelete: (record: CycleRow) => void; onCloseOngoing: (record: CycleRow) => void }) { return <section className="surface-card page-card"><div className="section-header"><div><h2>سجل الدورات</h2><p>يمكنكِ تعديل أي سجل أو حذفه بعد التأكيد.</p></div><button className="primary-button" onClick={onAdd}><Plus size={16} />إضافة</button></div><div className="record-list">{cycles.length ? cycles.map(record => <div className="surface-card record-row" key={record.id}><div className="record-copy"><h3>{formatDate(record.startDate)} {record.endDate ? `— ${formatDate(record.endDate)}` : "— مستمرة"}</h3><p>{record.endDate ? `المدة: ${Math.round((new Date(`${record.endDate}T12:00:00`).getTime() - new Date(`${record.startDate}T12:00:00`).getTime()) / 86400000) + 1} أيام` : "لم يُسجل آخر يوم بعد"}{record.symptoms.length ? ` • ${record.symptoms.join("، ")}` : ""}</p>{record.notes && <p>{record.notes}</p>}<span className={`badge ${record.endDate ? "complete" : ""}`}>{record.endDate ? "مكتملة" : "مستمرة"}</span></div><div className="record-actions">{!record.endDate && <button className="mini-action" aria-label="إضافة تاريخ نهاية الحيض" onClick={() => onCloseOngoing(record)}><CheckCircle2 size={16} /></button>}<button className="mini-action" aria-label="تعديل السجل" onClick={() => onEdit(record)}><Pencil size={15} /></button><button className="mini-action delete" aria-label="حذف السجل" onClick={() => onDelete(record)}><Trash2 size={15} /></button></div></div>) : <div className="empty-state">لا توجد دورات مسجلة بعد. أضيفي أول سجل لبدء التوقعات.</div>}</div></section>; }

function CalendarTab({ cursor, setCursor, selectedDay, setSelectedDay, periodDays, fertileDays, cycles, today }: { cursor: Date; setCursor: (date: Date) => void; selectedDay: string; setSelectedDay: (date: string) => void; periodDays: Set<string>; fertileDays: Set<string>; cycles: CycleRow[]; today: string }) { const year = cursor.getFullYear(); const month = cursor.getMonth(); const firstOffset = (new Date(year, month, 1).getDay() + 6) % 7; const totalDays = new Date(year, month + 1, 0).getDate(); const selectedRecord = cycles.find(record => selectedDay >= record.startDate && selectedDay <= (record.endDate ?? today)); const selection = selectedRecord ? `حيض ${selectedRecord.endDate ? "مسجل" : "مستمر"} في هذا اليوم.` : fertileDays.has(selectedDay) ? "هذا اليوم ضمن نافذة الخصوبة المتوقعة." : "لا يوجد سجل أو توقع خاص لهذا اليوم."; return <section className="surface-card page-card"><div><h2>التقويم الشهري</h2><p>اضغطي على أي يوم لرؤية ملخصه.</p></div><div className="calendar-head"><div className="calendar-nav"><button aria-label="الشهر السابق" onClick={() => setCursor(new Date(year, month - 1, 1))}><ChevronRight size={17} /></button><button aria-label="الشهر التالي" onClick={() => setCursor(new Date(year, month + 1, 1))}><ChevronLeft size={17} /></button></div><h3>{monthNames[month]} {year}</h3></div><div className="weekday-grid">{weekdays.map(day => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{Array.from({ length: firstOffset }).map((_, index) => <span className="calendar-blank" key={`blank-${index}`} />)}{Array.from({ length: totalDays }).map((_, index) => { const day = index + 1; const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`; const className = `calendar-day ${periodDays.has(key) ? "period" : ""} ${fertileDays.has(key) ? "fertile" : ""} ${key === today ? "today" : ""} ${key === selectedDay ? "selected" : ""}`; return <button key={key} className={className} onClick={() => setSelectedDay(key)} aria-label={formatDate(key)}>{day}</button>; })}</div><div className="legend"><span><i />أيام الحيض</span><span><i className="fertile-dot" />الخصوبة المتوقعة</span><span><i className="today-dot" />اليوم</span></div><div className="day-detail"><strong>{formatDate(selectedDay)}</strong><br />{selection}</div></section>; }

function ChatTab({ messages, input, setInput, onSubmit }: { messages: ChatMessage[]; input: string; setInput: (value: string) => void; onSubmit: (event: FormEvent) => void }) { return <section className="surface-card page-card"><div className="section-header"><div><h2>مساعد زُهيرة</h2><p>إرشادات عامة تعمل دون اتصال</p></div><MessageCircle size={21} color="var(--accent)" /></div><div className="chat-disclaimer"><CircleHelp size={17} className="shrink-0 mt-0.5" />هذا المساعد ليس أداة طبية ولا يقدّم تشخيصاً أو علاجاً. عند ألم شديد، نزيف غير معتاد، أو قلق مستمر، تواصلي مع مختصة أو اطلبي الرعاية العاجلة.</div><div className="chat-log" aria-live="polite">{messages.map(message => <div key={message.id} className={`chat-bubble ${message.role === "user" ? "user" : ""}`}>{message.text}</div>)}</div><form className="chat-composer" onSubmit={onSubmit}><input value={input} onChange={event => setInput(event.target.value)} placeholder="اكتبي سؤالك هنا..." aria-label="سؤال للمساعد" /><button type="submit" aria-label="إرسال السؤال"><Send size={17} /></button></form></section>; }

function SettingsTab({ name, setName, cycleLength, setCycleLength, profile, latestRecord, onSubmit, onTheme, onStealth, onEditLatest, onLogout, busy }: { name: string; setName: (value: string) => void; cycleLength: number; setCycleLength: (value: number) => void; profile: ProfileData; latestRecord: CycleRow | null; onSubmit: (event: FormEvent) => void; onTheme: (theme: ThemeName) => void; onStealth: () => void; onEditLatest: () => void; onLogout: () => void; busy: boolean }) { return <section className="surface-card page-card"><div><h2>الإعدادات والخصوصية</h2><p>عدّلي بيانات ملفكِ واختاري الشكل الذي يريحكِ.</p></div><form className="form-stack" onSubmit={onSubmit}><div className="field"><label>الاسم المعروض</label><input value={name} onChange={event => setName(event.target.value)} /></div><div className="field"><label>متوسط طول الدورة</label><input type="number" min="20" max="45" value={cycleLength} onChange={event => setCycleLength(Number(event.target.value))} /></div><button className="secondary-button" type="submit" disabled={busy}><UserRound size={16} />حفظ الملف الشخصي</button></form><div className="settings-group"><h3>آخر حيض مسجل</h3><p>{latestRecord ? `بدأ في ${formatDate(latestRecord.startDate)}. يمكنكِ تعديل البداية أو إضافة تاريخ النهاية من هنا.` : "لا يوجد سجل حتى الآن. أضيفي أول يوم لبدء المتابعة."}</p><button className="secondary-button" type="button" onClick={onEditLatest}>{latestRecord ? <><Pencil size={16} />تعديل آخر حيض</> : <><Plus size={16} />إضافة آخر حيض</>}</button></div><div className="settings-group"><h3>ثيم التطبيق</h3><p>اختاري أحد الألوان التالية. يتم حفظ الاختيار في حسابكِ.</p><div className="theme-grid">{themes.map(theme => <button key={theme.value} className={`theme-button ${profile.theme === theme.value ? "selected" : ""}`} onClick={() => onTheme(theme.value)} disabled={busy}><i className={`theme-swatch ${theme.className}`} />{theme.label}</button>)}</div></div><div className="settings-group"><h3>وضع التخفي</h3><p>يعرض شاشة محايدة لا تحتوي على أي تفاصيل عن الدورة أو التطبيق.</p><div className="toggle-row"><div><strong>تفعيل وضع التخفي</strong><span>يمكنكِ العودة إلى التطبيق من الشاشة المحايدة.</span></div><button className="switch" type="button" aria-label="تفعيل وضع التخفي" onClick={onStealth} disabled={busy}><i /></button></div></div><div className="settings-group"><h3>الحساب</h3><p>بياناتكِ محفوظة بشكل منفصل عن باقي المستخدمين.</p><button className="secondary-button" type="button" onClick={onLogout}><LogOut size={16} />تسجيل الخروج</button></div></section>; }

function Navigation({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) { const items: { id: Tab; label: string; icon: React.ReactNode }[] = [{ id: "home", label: "الرئيسية", icon: <HeartPulse size={18} /> }, { id: "records", label: "السجل", icon: <Droplets size={18} /> }, { id: "calendar", label: "التقويم", icon: <CalendarDays size={18} /> }, { id: "chat", label: "المساعد", icon: <MessageCircle size={18} /> }, { id: "settings", label: "الإعدادات", icon: <Settings size={18} /> }]; return <nav className="bottom-nav" aria-label="التنقل الرئيسي"><div className="bottom-nav-inner">{items.map(item => <button key={item.id} className={`nav-item ${active === item.id ? "active" : ""}`} onClick={() => onChange(item.id)}>{item.icon}<span>{item.label}</span></button>)}</div></nav>; }

function RecordDialog({ open, onOpenChange, form, setForm, onToggleSymptom, onSubmit, busy }: { open: boolean; onOpenChange: (open: boolean) => void; form: RecordFormState; setForm: React.Dispatch<React.SetStateAction<RecordFormState>>; onToggleSymptom: (symptom: string) => void; onSubmit: (event: FormEvent) => void; busy: boolean }) { const isEdit = Boolean(form.id); return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="dialog-content" dir="rtl"><DialogHeader><DialogTitle>{isEdit ? "تعديل سجل الدورة" : "تسجيل دورة جديدة"}</DialogTitle><DialogDescription>أضيفي تاريخ البداية، واتركي تاريخ النهاية فارغاً إذا كان الحيض مستمراً.</DialogDescription></DialogHeader><form className="form-stack" onSubmit={onSubmit}><div className="field"><label>أول يوم لنزول الدم</label><input type="date" max={dateKey(new Date())} value={form.startDate} onChange={event => setForm(current => ({ ...current, startDate: event.target.value }))} required /></div><div className="field"><label>آخر يوم للحيض <span className="font-normal">(اختياري)</span></label><input type="date" min={form.startDate} max={dateKey(new Date())} value={form.endDate} onChange={event => setForm(current => ({ ...current, endDate: event.target.value }))} /><span className="field-hint">{form.endDate ? "سيُعامل السجل كدورة مكتملة." : "سيظهر السجل كحيض مستمر ويمكن إغلاقه لاحقاً."}</span></div><div className="field"><label>أعراض مرافقة <span className="font-normal">(اختياري)</span></label><div className="symptom-grid">{symptomOptions.map(symptom => <label key={symptom} className="symptom-choice"><input type="checkbox" checked={form.symptoms.includes(symptom)} onChange={() => onToggleSymptom(symptom)} />{symptom}</label>)}</div></div><div className="field"><label>ملاحظات خاصة <span className="font-normal">(اختياري)</span></label><textarea value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} placeholder="مثال: ألم أخف من المعتاد" maxLength={1000} /></div><button className="primary-button" disabled={busy} type="submit"><CheckCircle2 size={16} />{busy ? "جارٍ الحفظ..." : isEdit ? "حفظ التعديل" : "حفظ السجل"}</button></form></DialogContent></Dialog>; }
