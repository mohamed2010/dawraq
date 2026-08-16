"use client";

import { useAuth } from "@/_core/hooks/useAuth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, ApiError, useApiCache } from "@/lib/api";
import { BrowserMedicationReminderController, MedicationPanel } from "@/components/MedicationTools";
import { CycleGuidancePanel } from "@/components/CycleGuidancePanel";
import { HealthPatternAlerts } from "@/components/HealthPatternAlerts";
import { LanguageController, type AppLanguage } from "@/components/LanguageController";
import { AccountSecurityPanel, AppLockScreen, ClinicianSharingPanel, DeviceLockPanel, PrivacyToolsPanel } from "@/components/PrivacyTools";
import { HealthIntegrationConsentPanel } from "@/components/HealthIntegrationConsentPanel";
import { DailyHealthPanel, ProfileHealthPanel, ReferenceStatsPanel } from "@/components/ReferenceFeaturePanels";
import { WellnessTrends } from "@/components/WellnessTrends";
import { AccessibilityPanel, GeneralReminderPanel, LifeStagePanel, ReportsAndBackupPanel } from "@/components/EnhancementTools";
import { OfflineModeBar } from "@/components/OfflineMode";
import { NotionImportPanel } from "@/components/NotionImportPanel";
import { createOfflineOperationId, enqueueOfflineOperation, listOfflineOperations, loadOfflineSnapshot, offlineOperationCount, removeOfflineOperation, saveOfflineSnapshot, type OfflineSnapshot } from "@/lib/offline-store";
import { addCalendarDays, calculateCycleStatistics, dateKey, daysInRange, type CycleRecordForStats } from "@shared/cycleMath";
import { Activity, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, CircleHelp, CloudOff, Droplets, EyeOff, Flower2, HeartPulse, LogIn, LogOut, MessageCircle, Moon, Pencil, Pill, Plus, Send, Settings, ShieldCheck, Sparkles, Trash2, UserRound, X } from "lucide-react";
import { CSSProperties, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Tab = "home" | "records" | "calendar" | "medications" | "chat" | "settings";
type SettingsSection = "profile" | "preferences" | "wellbeing" | "data" | "security";
type ThemeName = "light" | "dark" | "pink" | "purple";
type FlowVolume = "light" | "medium" | "heavy";
type CycleRow = CycleRecordForStats & { symptoms: string[]; flowVolume: FlowVolume; notes: string | null };
type RecordFormState = { id: number | null; startDate: string; endDate: string; symptoms: string[]; flowVolume: FlowVolume; notes: string };
type ChatMessage = { id: number; role: "assistant" | "user"; text: string };
type ProfileData = { displayName: string; averageCycleLength: number; typicalBleedingDays: number; relationshipStatus: RelationshipStatus; pregnancyStatus: PregnancyStatus; theme: ThemeName; language: AppLanguage; tryingToConceive: boolean; stealthMode: number; onboardingCompleted: number };
type MoodValue = "very_low" | "low" | "neutral" | "good" | "great" | "irritable" | "anxious";
type RelationshipStatus = "single" | "married";
type PregnancyStatus = "not_pregnant" | "pregnant" | "not_sure";
type FertilityMucus = "not_observed" | "dry" | "sticky" | "creamy" | "watery" | "egg_white";
type TestResult = "not_taken" | "negative" | "positive" | "unclear";
type DailyEntryRow = { id: number; entryDate: string; mood: MoodValue; painLevel: number; symptoms: string[]; customSymptoms: string[]; energyLevel: number; weightKg: number | null; basalTemperature: number | null; cervicalMucus: FertilityMucus; opkResult: TestResult; pregnancyTest: TestResult; notes: string | null };
type DailyFormState = Omit<DailyEntryRow, "id" | "notes"> & { id: number | null; notes: string };

const dialogThemeValues: Record<ThemeName, Record<string, string>> = {
  light: { "--surface": "#ffffff", "--surface-soft": "#fff1f6", "--surface-muted": "#f8f7fc", "--ink": "#312239", "--muted": "#806e7a", "--line": "#f4d8e3", "--accent": "#ed3f73", "--accent-strong": "#c9265b", "--accent-soft": "#ffe1eb", "--accent-contrast": "#ffffff", "--purple": "#8c64ca", "--green": "#187c68", "--green-soft": "#def8ef" },
  dark: { "--surface": "#24232e", "--surface-soft": "#302632", "--surface-muted": "#2d2b38", "--ink": "#fbf9ff", "--muted": "#c5bfce", "--line": "#413b4b", "--accent": "#ff6696", "--accent-strong": "#ff8bb0", "--accent-soft": "#452c3a", "--accent-contrast": "#23111a", "--purple": "#aa96ff", "--green": "#64d8b7", "--green-soft": "#1f4740" },
  pink: { "--surface": "#ffffff", "--surface-soft": "#fff1f6", "--surface-muted": "#fff8fb", "--ink": "#312239", "--muted": "#806e7a", "--line": "#f4d8e3", "--accent": "#ed3f73", "--accent-strong": "#c9265b", "--accent-soft": "#ffe1eb", "--accent-contrast": "#ffffff", "--purple": "#8c64ca", "--green": "#187c68", "--green-soft": "#def8ef" },
  purple: { "--surface": "#ffffff", "--surface-soft": "#f4efff", "--surface-muted": "#fbfaff", "--ink": "#2d2541", "--muted": "#766d88", "--line": "#e8e0f7", "--accent": "#7656dc", "--accent-strong": "#5a3fbc", "--accent-soft": "#e9e0ff", "--accent-contrast": "#ffffff", "--purple": "#8d63df", "--green": "#168269", "--green-soft": "#ddf8ee" },
};
const dialogThemeStyle = (theme: ThemeName): CSSProperties => dialogThemeValues[theme] as CSSProperties;

const symptomOptions = ["تقلصات", "صداع", "انتفاخ", "تقلبات مزاجية", "حب الشباب", "إرهاق"];
const dailySymptomOptions = ["تقلصات", "صداع", "انتفاخ", "إرهاق", "غثيان", "ألم الثدي", "تغير الشهية", "تقلبات مزاجية"];
const moodOptions: { value: MoodValue; label: string; emoji: string }[] = [
  { value: "very_low", label: "مرهقة", emoji: "😣" },
  { value: "low", label: "منخفض", emoji: "😕" },
  { value: "neutral", label: "متوازن", emoji: "😐" },
  { value: "good", label: "جيد", emoji: "🙂" },
  { value: "great", label: "ممتاز", emoji: "😄" },
  { value: "irritable", label: "متوترة", emoji: "😤" },
  { value: "anxious", label: "قلقة", emoji: "😟" },
];
const painLabels = ["لا يوجد", "خفيف", "متوسط", "مزعج", "شديد"];
const themes: { value: ThemeName; label: string; className: string }[] = [
  { value: "light", label: "فاتح", className: "" },
  { value: "dark", label: "داكن", className: "dark" },
  { value: "pink", label: "وردي", className: "pink" },
  { value: "purple", label: "بنفسجي", className: "purple" },
];
const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const weekdays = ["الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"];

const formatDate = (value: string | null) => value
  ? new Intl.DateTimeFormat(typeof document !== "undefined" && document.documentElement.lang === "en" ? "en-GB" : "ar-EG", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00`))
  : "غير متاح";

function emptyRecordForm(): RecordFormState {
  return { id: null, startDate: dateKey(new Date()), endDate: "", symptoms: [], flowVolume: "medium", notes: "" };
}

function emptyDailyForm(entryDate = dateKey(new Date())): DailyFormState {
  return { id: null, entryDate, mood: "neutral", painLevel: 0, symptoms: [], customSymptoms: [], energyLevel: 3, weightKg: null, basalTemperature: null, cervicalMucus: "not_observed", opkResult: "not_taken", pregnancyTest: "not_taken", notes: "" };
}

function replyFor(question: string) {
  const normalized = question.trim().toLowerCase();
  if (/تأخر|متأخر|معاد/.test(normalized)) return "قد يحدث التأخر بسبب التوتر أو تغيرات الوزن أو النوم أو الحمل أو أسباب هرمونية. إذا كان هناك احتمال حمل أو استمر التأخر، استخدمي اختباراً مناسباً وتواصلي مع طبيبة. الألم الشديد أو النزيف غير المعتاد يحتاج تقييماً عاجلاً.";
  if (/تبويض|خصوب|حمل/.test(normalized)) return "نافذة الخصوبة هنا تقدير مبني على السجلات السابقة وليست وسيلة مؤكدة لمنع الحمل أو حدوثه. تتغير الإباضة من دورة لأخرى، لذلك استشيري مختصة عند التخطيط للحمل أو لتجنب الحمل.";
  if (/ألم|مغص|صداع|نزيف|إفراز/.test(normalized)) return "الأعراض الخفيفة قد ترافق الدورة، ويمكن أن يساعد الراحة والترطيب وتدوين النمط. إذا كان الألم شديداً أو مفاجئاً، أو النزيف غزيراً أو مختلفاً عن المعتاد، أو ظهرت حمى أو دوار؛ اطلبي رعاية طبية.";
  return "أفهم سؤالك. هذا المساعد يقدم إرشادات عامة فقط ولا يمكنه تشخيص أي حالة. يمكنكِ تدوين الأعراض ومواعيد الدورة، واستشارة طبيبة عند وجود قلق أو تغير مستمر.";
}

export default function Home() {
  const { user, loading, isAuthenticated, refresh: refreshAccount, logout } = useAuth();
  const profileQuery = api.profile.get.useQuery(undefined, { enabled: isAuthenticated });
  const cyclesQuery = api.cycles.list.useQuery(undefined, { enabled: isAuthenticated });
  const dailyEntriesQuery = api.dailyEntries.list.useQuery(undefined, { enabled: isAuthenticated });
  const medicationsQuery = api.medications.list.useQuery(undefined, { enabled: isAuthenticated });
  const appLockQuery = api.privacyLock.status.useQuery(undefined, { enabled: isAuthenticated });
  const deviceLockQuery = api.deviceLock.status.useQuery(undefined, { enabled: isAuthenticated });
  const saveProfile = api.profile.save.useMutation();
  const createCycle = api.cycles.create.useMutation();
  const updateCycle = api.cycles.update.useMutation();
  const deleteCycle = api.cycles.delete.useMutation();
  const saveDailyEntry = api.dailyEntries.save.useMutation();
  const deleteDailyEntry = api.dailyEntries.delete.useMutation();
  const takeMedicationDose = api.medications.takeDose.useMutation();
  const [tab, setTab] = useState<Tab>("home");
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("profile");
  const [recordOpen, setRecordOpen] = useState(false);
  const [recordForm, setRecordForm] = useState<RecordFormState>(emptyRecordForm);
  const [deleteTarget, setDeleteTarget] = useState<CycleRow | null>(null);
  const [dailyOpen, setDailyOpen] = useState(false);
  const [dailyForm, setDailyForm] = useState<DailyFormState>(emptyDailyForm);
  const [deleteDailyTarget, setDeleteDailyTarget] = useState<DailyEntryRow | null>(null);
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(dateKey(new Date()));
  const [settingsName, setSettingsName] = useState("");
  const [settingsCycleLength, setSettingsCycleLength] = useState(28);
  const [settingsBleedingDays, setSettingsBleedingDays] = useState(5);
  const [settingsRelationship, setSettingsRelationship] = useState<RelationshipStatus>("single");
  const [settingsPregnancy, setSettingsPregnancy] = useState<PregnancyStatus>("not_pregnant");
  const [onboardingName, setOnboardingName] = useState("");
  const [onboardingCycleLength, setOnboardingCycleLength] = useState(28);
  const [onboardingBleedingDays, setOnboardingBleedingDays] = useState(5);
  const [onboardingRelationship, setOnboardingRelationship] = useState<RelationshipStatus>("single");
  const [onboardingPregnancy, setOnboardingPregnancy] = useState<PregnancyStatus>("not_pregnant");
  const [onboardingLastPeriod, setOnboardingLastPeriod] = useState(dateKey(new Date()));
  const [onboardingEndDate, setOnboardingEndDate] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{ id: 1, role: "assistant", text: "أهلاً بكِ. اسأليني عن متابعة الدورة أو الأعراض أو الخصوبة، وسأقدم إرشادات عامة تعمل دون اتصال." }]);
  const [privacyLocked, setPrivacyLocked] = useState(false);
  const [online, setOnline] = useState(true);
  const [offlineSnapshot, setOfflineSnapshot] = useState<OfflineSnapshot | null>(null);
  const [offlineLoaded, setOfflineLoaded] = useState(false);
  const [pendingOfflineChanges, setPendingOfflineChanges] = useState(0);
  const [, setLocaleTick] = useState(0);
  const refreshLocaleFormatting = useCallback(() => setLocaleTick(current => current + 1), []);

  const profile = profileQuery.data ?? (!online ? offlineSnapshot?.profile ?? null : null);
  const cycles = (cyclesQuery.data ?? (!online ? offlineSnapshot?.cycles ?? [] : [])) as CycleRow[];
  const dailyEntries = (dailyEntriesQuery.data ?? (!online ? offlineSnapshot?.dailyEntries ?? [] : [])) as DailyEntryRow[];
  const medications = medicationsQuery.data ?? (!online ? offlineSnapshot?.medications ?? [] : []);
  const today = dateKey(new Date());
  const statistics = useMemo(() => calculateCycleStatistics(cycles, profile?.averageCycleLength ?? 28, today), [cycles, profile?.averageCycleLength, today]);
  const isBusy = saveProfile.isPending || createCycle.isPending || updateCycle.isPending || deleteCycle.isPending || saveDailyEntry.isPending || deleteDailyEntry.isPending;

  useEffect(() => {
    if (!profile) return;
    setSettingsName(profile.displayName);
    setSettingsCycleLength(profile.averageCycleLength);
    setSettingsBleedingDays(profile.typicalBleedingDays);
    setSettingsRelationship(profile.relationshipStatus);
    setSettingsPregnancy(profile.pregnancyStatus);
  }, [profile]);

  useEffect(() => {
    const updateConnectivity = () => setOnline(navigator.onLine);
    updateConnectivity();
    window.addEventListener("online", updateConnectivity);
    window.addEventListener("offline", updateConnectivity);
    return () => { window.removeEventListener("online", updateConnectivity); window.removeEventListener("offline", updateConnectivity); };
  }, []);

  useEffect(() => {
    if (!user) { setOfflineSnapshot(null); setOfflineLoaded(true); setPendingOfflineChanges(0); return; }
    setOfflineLoaded(false);
    void Promise.all([loadOfflineSnapshot(user.id), offlineOperationCount(user.id)]).then(([snapshot, count]) => { setOfflineSnapshot(snapshot); setPendingOfflineChanges(count); }).catch(() => undefined).finally(() => setOfflineLoaded(true));
  }, [user?.id]);

  useEffect(() => {
    if (!user || !profile || !cyclesQuery.data || !dailyEntriesQuery.data || !medicationsQuery.data) return;
    void saveOfflineSnapshot(user.id, { profile, cycles: cyclesQuery.data, dailyEntries: dailyEntriesQuery.data, medications: medicationsQuery.data, savedAt: new Date().toISOString() }).catch(() => undefined);
  }, [user?.id, profile, cyclesQuery.data, dailyEntriesQuery.data, medicationsQuery.data]);

  useEffect(() => {
    document.documentElement.dataset.theme = profile?.theme ?? "pink";
  }, [profile?.theme]);

  const refreshData = async () => {
    if (!online) return;
    await Promise.all([profileQuery.refetch(), cyclesQuery.refetch(), dailyEntriesQuery.refetch(), medicationsQuery.refetch(), appLockQuery.refetch(), deviceLockQuery.refetch()]);
  };
  const syncOfflineChanges = useCallback(async () => {
    if (!user || !online) return;
    const operations = await listOfflineOperations(user.id);
    if (!operations.length) return;
    for (const operation of operations) {
      try {
        if (operation.resource === "cycle" && operation.action === "create") await createCycle.mutateAsync(operation.payload);
        if (operation.resource === "cycle" && operation.action === "update") await updateCycle.mutateAsync(operation.payload);
        if (operation.resource === "cycle" && operation.action === "delete") await deleteCycle.mutateAsync(operation.payload);
        if (operation.resource === "daily-entry" && operation.action === "save") await saveDailyEntry.mutateAsync(operation.payload);
        if (operation.resource === "daily-entry" && operation.action === "delete") await deleteDailyEntry.mutateAsync(operation.payload);
        await removeOfflineOperation(operation.id);
      } catch (error) {
        toast.error(error instanceof Error ? `توقفت مزامنة تغيير محلي: ${error.message}` : "توقفت مزامنة تغيير محلي. لم يتم حذفه.");
        break;
      }
    }
    const count = await offlineOperationCount(user.id);
    setPendingOfflineChanges(count);
    if (!count) { await refreshData(); toast.success("تمت مزامنة تغييراتكِ المحلية."); }
  }, [user?.id, online, createCycle, updateCycle, deleteCycle, saveDailyEntry, deleteDailyEntry]);
  const confirmReminderDose = useCallback(async (id: number, scheduledTime: string) => {
    await takeMedicationDose.mutateAsync({ id, doseDate: dateKey(new Date()), scheduledTime });
    toast.success("تم تسجيل الجرعة لهذا الوقت.");
  }, [takeMedicationDose]);

  useEffect(() => {
    if ((!appLockQuery.data?.enabled && !deviceLockQuery.data?.enabled) || typeof window === "undefined") return;
    const lock = () => setPrivacyLocked(true);
    const onVisibility = () => { if (document.visibilityState === "hidden") lock(); };
    window.addEventListener("blur", lock);
    document.addEventListener("visibilitychange", onVisibility);
    return () => { window.removeEventListener("blur", lock); document.removeEventListener("visibilitychange", onVisibility); };
  }, [appLockQuery.data?.enabled, deviceLockQuery.data?.enabled]);

  const saveCurrentProfile = async (changes: Partial<{ displayName: string; averageCycleLength: number; typicalBleedingDays: number; relationshipStatus: RelationshipStatus; pregnancyStatus: PregnancyStatus; theme: ThemeName; language: AppLanguage; tryingToConceive: boolean; stealthMode: boolean; onboardingCompleted: boolean }>) => {
    if (!profile) return;
    try {
      await saveProfile.mutateAsync({
        displayName: changes.displayName ?? profile.displayName,
        averageCycleLength: changes.averageCycleLength ?? profile.averageCycleLength,
        typicalBleedingDays: changes.typicalBleedingDays ?? profile.typicalBleedingDays,
        relationshipStatus: changes.relationshipStatus ?? profile.relationshipStatus,
        pregnancyStatus: changes.pregnancyStatus ?? profile.pregnancyStatus,
        theme: changes.theme ?? profile.theme,
        language: changes.language ?? profile.language ?? "ar",
        tryingToConceive: changes.tryingToConceive ?? Boolean(profile.tryingToConceive),
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
      await saveProfile.mutateAsync({ displayName: onboardingName.trim(), averageCycleLength: onboardingCycleLength, typicalBleedingDays: onboardingBleedingDays, relationshipStatus: onboardingRelationship, pregnancyStatus: onboardingPregnancy, theme: "pink", language: "ar", tryingToConceive: false, stealthMode: false, onboardingCompleted: true });
      await createCycle.mutateAsync({ startDate: onboardingLastPeriod, endDate: onboardingEndDate || null, symptoms: [], flowVolume: "medium", notes: "بداية متابعة زُهيرة" });
      await refreshData();
      toast.success("تم تجهيز ملفكِ الخاص بنجاح.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تجهيز الملف الآن.");
    }
  };

  const openNewRecord = () => { setRecordForm(emptyRecordForm()); setRecordOpen(true); };
  const openEditRecord = (record: CycleRow) => {
    setRecordForm({ id: record.id, startDate: record.startDate, endDate: record.endDate ?? "", symptoms: record.symptoms, flowVolume: record.flowVolume ?? "medium", notes: record.notes ?? "" });
    setRecordOpen(true);
  };
  const closeOngoingRecord = (record: CycleRow) => {
    setRecordForm({ id: record.id, startDate: record.startDate, endDate: today, symptoms: record.symptoms, flowVolume: record.flowVolume ?? "medium", notes: record.notes ?? "" });
    setRecordOpen(true);
  };
  const toggleSymptom = (symptom: string) => setRecordForm(current => ({ ...current, symptoms: current.symptoms.includes(symptom) ? current.symptoms.filter(item => item !== symptom) : [...current.symptoms, symptom] }));
  const saveRecord = async (event: FormEvent) => {
    event.preventDefault();
    if (recordForm.endDate && recordForm.endDate < recordForm.startDate) return toast.error("تاريخ النهاية لا يمكن أن يسبق البداية.");
    try {
      const payload = { startDate: recordForm.startDate, endDate: recordForm.endDate || null, symptoms: recordForm.symptoms, flowVolume: recordForm.flowVolume, notes: recordForm.notes.trim() || null };
      if (!online && user) {
        const temporaryId = recordForm.id ?? -Date.now();
        const operation = recordForm.id ? { id: createOfflineOperationId(), accountId: user.id, resource: "cycle" as const, action: "update" as const, payload: { id: recordForm.id, ...payload }, createdAt: new Date().toISOString() } : { id: createOfflineOperationId(), accountId: user.id, resource: "cycle" as const, action: "create" as const, payload, createdAt: new Date().toISOString() };
        await enqueueOfflineOperation(operation);
        setOfflineSnapshot(current => current ? { ...current, cycles: recordForm.id ? current.cycles.map(item => item.id === recordForm.id ? { ...item, ...payload, symptomsJson: JSON.stringify(payload.symptoms) } : item) : [{ id: temporaryId, userId: user.id, ...payload, symptomsJson: JSON.stringify(payload.symptoms) }, ...current.cycles], savedAt: new Date().toISOString() } : current);
        setPendingOfflineChanges(await offlineOperationCount(user.id));
        setRecordOpen(false);
        toast.success("تم حفظ سجل الدورة محلياً وسيُرسل عند عودة الاتصال.");
        return;
      }
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
      if (!online && user) {
        if (deleteTarget.id > 0) await enqueueOfflineOperation({ id: createOfflineOperationId(), accountId: user.id, resource: "cycle", action: "delete", payload: { id: deleteTarget.id }, createdAt: new Date().toISOString() });
        setOfflineSnapshot(current => current ? { ...current, cycles: current.cycles.filter(item => item.id !== deleteTarget.id), savedAt: new Date().toISOString() } : current);
        setPendingOfflineChanges(await offlineOperationCount(user.id));
        setDeleteTarget(null);
        toast.success("تم الحذف محلياً وسيُرسل عند عودة الاتصال.");
        return;
      }
      await deleteCycle.mutateAsync({ id: deleteTarget.id });
      setDeleteTarget(null);
      await cyclesQuery.refetch();
      toast.success("تم حذف السجل.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر حذف السجل.");
    }
  };
  const openDailyEntry = (entryDate: string) => {
    const existing = dailyEntries.find(entry => entry.entryDate === entryDate);
    setDailyForm(existing ? { id: existing.id, entryDate: existing.entryDate, mood: existing.mood, painLevel: existing.painLevel, symptoms: existing.symptoms, customSymptoms: existing.customSymptoms ?? [], energyLevel: existing.energyLevel ?? 3, weightKg: existing.weightKg, basalTemperature: existing.basalTemperature, cervicalMucus: existing.cervicalMucus ?? "not_observed", opkResult: existing.opkResult ?? "not_taken", pregnancyTest: existing.pregnancyTest ?? "not_taken", notes: existing.notes ?? "" } : emptyDailyForm(entryDate));
    setDailyOpen(true);
  };
  const toggleDailySymptom = (symptom: string) => setDailyForm(current => ({ ...current, symptoms: current.symptoms.includes(symptom) ? current.symptoms.filter(item => item !== symptom) : [...current.symptoms, symptom] }));
  const saveDaily = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const { id: _dailyEntryId, ...dailyPayload } = dailyForm;
      const payload = { ...dailyPayload, notes: dailyForm.notes.trim() || null };
      if (!online && user) {
        await enqueueOfflineOperation({ id: createOfflineOperationId(), accountId: user.id, resource: "daily-entry", action: "save", payload, createdAt: new Date().toISOString() });
        const temporaryId = dailyForm.id ?? -Date.now();
        setOfflineSnapshot(current => current ? { ...current, dailyEntries: current.dailyEntries.some(item => item.entryDate === payload.entryDate) ? current.dailyEntries.map(item => item.entryDate === payload.entryDate ? { ...item, ...payload, symptomsJson: JSON.stringify(payload.symptoms) } : item) : [{ id: temporaryId, userId: user.id, ...payload, symptomsJson: JSON.stringify(payload.symptoms) }, ...current.dailyEntries], savedAt: new Date().toISOString() } : current);
        setPendingOfflineChanges(await offlineOperationCount(user.id));
        setDailyOpen(false);
        toast.success("تم حفظ متابعة اليوم محلياً وسيُرسل عند عودة الاتصال.");
        return;
      }
      await saveDailyEntry.mutateAsync(payload);
      setDailyOpen(false);
      await dailyEntriesQuery.refetch();
      toast.success(dailyForm.id ? "تم تعديل متابعة اليوم." : "تم حفظ متابعة اليوم.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر حفظ متابعة اليوم الآن.");
    }
  };
  const saveDailyFromPanel = async (input: { entryDate: string; mood: MoodValue; painLevel: number; symptoms: string[]; notes: string | null }) => {
    try {
      const existing = dailyEntries.find(entry => entry.entryDate === input.entryDate);
      const payload = { ...input, customSymptoms: existing?.customSymptoms ?? [], energyLevel: existing?.energyLevel ?? 3, weightKg: existing?.weightKg ?? null, basalTemperature: existing?.basalTemperature ?? null, cervicalMucus: existing?.cervicalMucus ?? "not_observed", opkResult: existing?.opkResult ?? "not_taken", pregnancyTest: existing?.pregnancyTest ?? "not_taken" };
      if (!online && user) {
        await enqueueOfflineOperation({ id: createOfflineOperationId(), accountId: user.id, resource: "daily-entry", action: "save", payload, createdAt: new Date().toISOString() });
        const temporaryId = existing?.id ?? -Date.now();
        setOfflineSnapshot(current => current ? { ...current, dailyEntries: current.dailyEntries.some(item => item.entryDate === payload.entryDate) ? current.dailyEntries.map(item => item.entryDate === payload.entryDate ? { ...item, ...payload, symptomsJson: JSON.stringify(payload.symptoms) } : item) : [{ id: temporaryId, userId: user.id, ...payload, symptomsJson: JSON.stringify(payload.symptoms) }, ...current.dailyEntries], savedAt: new Date().toISOString() } : current);
        setPendingOfflineChanges(await offlineOperationCount(user.id));
        toast.success("تم حفظ متابعة اليوم محلياً وسيُرسل عند عودة الاتصال.");
        return;
      }
      await saveDailyEntry.mutateAsync(payload);
      await dailyEntriesQuery.refetch();
      toast.success("تم حفظ متابعة اليوم.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر حفظ متابعة اليوم الآن.");
    }
  };
  const confirmDeleteDaily = async () => {
    if (!deleteDailyTarget) return;
    try {
      if (!online && user) {
        if (deleteDailyTarget.id > 0) await enqueueOfflineOperation({ id: createOfflineOperationId(), accountId: user.id, resource: "daily-entry", action: "delete", payload: { id: deleteDailyTarget.id }, createdAt: new Date().toISOString() });
        setOfflineSnapshot(current => current ? { ...current, dailyEntries: current.dailyEntries.filter(item => item.id !== deleteDailyTarget.id), savedAt: new Date().toISOString() } : current);
        setPendingOfflineChanges(await offlineOperationCount(user.id));
        setDeleteDailyTarget(null);
        toast.success("تم الحذف محلياً وسيُرسل عند عودة الاتصال.");
        return;
      }
      await deleteDailyEntry.mutateAsync({ id: deleteDailyTarget.id });
      setDeleteDailyTarget(null);
      await dailyEntriesQuery.refetch();
      toast.success("تم حذف متابعة اليوم.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر حذف متابعة اليوم الآن.");
    }
  };
  const saveSettings = async (event: FormEvent) => {
    event.preventDefault();
    if (!settingsName.trim()) return toast.error("الاسم مطلوب.");
    await saveCurrentProfile({ displayName: settingsName.trim(), averageCycleLength: settingsCycleLength, typicalBleedingDays: settingsBleedingDays, relationshipStatus: settingsRelationship, pregnancyStatus: settingsPregnancy });
    toast.success("تم حفظ الملف الشخصي.");
  };
  const sendChat = (event: FormEvent) => {
    event.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    setChatMessages(current => [...current, { id: Date.now(), role: "user", text }, { id: Date.now() + 1, role: "assistant", text: replyFor(text) }]);
    setChatInput("");
  };

  if (isAuthenticated && (loading || ((!offlineLoaded || !offlineSnapshot) && (profileQuery.isLoading || cyclesQuery.isLoading || dailyEntriesQuery.isLoading || medicationsQuery.isLoading)) || (online && appLockQuery.isLoading))) {
    return <div className="tracker-app loading-screen"><Activity className="animate-pulse" size={30} /></div>;
  }
  if (!isAuthenticated) return <LoginPage />;
  if ((!offlineSnapshot && offlineLoaded && (profileQuery.isError || cyclesQuery.isError || dailyEntriesQuery.isError || medicationsQuery.isError)) || (online && appLockQuery.isError)) return <ProtectedDataError onRetry={refreshData} />;
  if (!profile?.onboardingCompleted) return <OnboardingPage onSubmit={finishOnboarding} name={onboardingName} setName={setOnboardingName} cycleLength={onboardingCycleLength} setCycleLength={setOnboardingCycleLength} lastPeriod={onboardingLastPeriod} setLastPeriod={setOnboardingLastPeriod} endDate={onboardingEndDate} setEndDate={setOnboardingEndDate} busy={isBusy} />;
  if (profile.stealthMode) return <StealthPage onReturn={() => saveCurrentProfile({ stealthMode: false })} busy={isBusy} />;
  if (privacyLocked && (appLockQuery.data?.enabled || deviceLockQuery.data?.enabled)) return <AppLockScreen onUnlock={() => setPrivacyLocked(false)} pinEnabled={Boolean(appLockQuery.data?.enabled)} />;

  const ongoingRecord = cycles.find(record => !record.endDate) ?? null;
  const periodDays = new Set(cycles.flatMap(record => daysInRange(record.startDate, record.endDate ?? today)));
  const fertileDays = new Set(statistics.fertileStart && statistics.fertileEnd ? daysInRange(statistics.fertileStart, statistics.fertileEnd) : []);

  return (
    <div className="tracker-app" data-theme={profile.theme} dir={profile.language === "en" ? "ltr" : "rtl"}>
      <LanguageController language={profile.language ?? "ar"} onApplied={refreshLocaleFormatting} />
      <div className="app-shell">
        <header className="topbar">
          <div className="brand"><div className="brand-mark"><Flower2 size={23} /></div><div><h1>زُهيرة</h1><p>مساحتكِ الخاصة لمتابعة دورتكِ</p></div></div>
          <button className="icon-button" aria-label="فتح الإعدادات" onClick={() => setTab("settings")}><Settings size={19} /></button>
        </header>
        <OfflineModeBar pendingChanges={pendingOfflineChanges} onSynchronize={syncOfflineChanges} />
        {tab === "home" && <><HomeTab profileName={profile.displayName} statistics={statistics} ongoingRecord={ongoingRecord} onAdd={openNewRecord} onCloseOngoing={closeOngoingRecord} onRecords={() => setTab("records")} /><CycleGuidancePanel statistics={statistics} today={today} dailyEntry={dailyEntries.find(entry => entry.entryDate === today) ?? null} tryingToConceive={profile.tryingToConceive} /><HealthPatternAlerts statistics={statistics} cycles={cycles} dailyEntries={dailyEntries} /></>}
        {tab === "records" && <RecordsTab cycles={cycles} onAdd={openNewRecord} onEdit={openEditRecord} onDelete={setDeleteTarget} onCloseOngoing={closeOngoingRecord} />}
        {tab === "calendar" && <><CalendarTab cursor={monthCursor} setCursor={setMonthCursor} selectedDay={selectedDay} setSelectedDay={setSelectedDay} periodDays={periodDays} fertileDays={fertileDays} cycles={cycles} dailyEntries={dailyEntries} today={today} /><DailyHealthPanel entryDate={selectedDay} entry={dailyEntries.find(item => item.entryDate === selectedDay) ?? null} onSave={saveDailyFromPanel} onDelete={entry => setDeleteDailyTarget(entry as DailyEntryRow)} busy={isBusy} /><ReferenceStatsPanel cycles={cycles} dailyEntries={dailyEntries} /><WellnessTrends dailyEntries={dailyEntries} /></>}
        {tab === "medications" && <MedicationPanel medications={medications} onRefresh={medicationsQuery.refetch} />}
        {tab === "chat" && <ChatTab messages={chatMessages} input={chatInput} setInput={setChatInput} onSubmit={sendChat} />}
        {tab === "settings" && <SettingsWorkspace active={settingsSection} onChange={setSettingsSection}>
          {settingsSection === "profile" && <><SettingsTab name={settingsName} setName={setSettingsName} cycleLength={settingsCycleLength} setCycleLength={setSettingsCycleLength} profile={profile} latestRecord={cycles[0] ?? null} onSubmit={saveSettings} onTheme={theme => saveCurrentProfile({ theme })} onLanguage={language => saveCurrentProfile({ language })} onStealth={() => saveCurrentProfile({ stealthMode: true })} onEditLatest={() => { if (cycles[0]) { openEditRecord(cycles[0]); } else { openNewRecord(); } }} onLogout={logout} busy={isBusy} compact /><ProfileHealthPanel profile={profile} onSave={saveCurrentProfile} busy={isBusy} /></>}
          {settingsSection === "preferences" && <><SettingsTab name={settingsName} setName={setSettingsName} cycleLength={settingsCycleLength} setCycleLength={setSettingsCycleLength} profile={profile} latestRecord={cycles[0] ?? null} onSubmit={saveSettings} onTheme={theme => saveCurrentProfile({ theme })} onLanguage={language => saveCurrentProfile({ language })} onStealth={() => saveCurrentProfile({ stealthMode: true })} onEditLatest={() => { if (cycles[0]) { openEditRecord(cycles[0]); } else { openNewRecord(); } }} onLogout={logout} busy={isBusy} preferencesOnly /><AccessibilityPanel userId={user!.id} /><GeneralReminderPanel userId={user!.id} nextPeriodStart={statistics.nextPeriodStart} /></>}
          {settingsSection === "wellbeing" && <LifeStagePanel userId={user!.id} />}
          {settingsSection === "data" && <><ReportsAndBackupPanel /><NotionImportPanel cycles={cycles} onImported={cyclesQuery.refetch} /></>}
          {settingsSection === "security" && <><AccountSecurityPanel email={user!.email} onEmailChanged={refreshAccount} /><DeviceLockPanel /><ClinicianSharingPanel /><HealthIntegrationConsentPanel /><PrivacyToolsPanel onLockStatusChange={appLockQuery.refetch} onAccountDeleted={logout} /><section className="surface-card page-card settings-logout-card"><h2>تسجيل الخروج</h2><p>أنهي جلستكِ الحالية بأمان على هذا الجهاز.</p><button className="secondary-button" type="button" onClick={logout}><LogOut size={16} />تسجيل الخروج</button></section></>}
        </SettingsWorkspace>}
      </div>
      <BrowserMedicationReminderController medications={medications} onDoseTaken={confirmReminderDose} />
      <Navigation active={tab} onChange={setTab} />
      <RecordDialog open={recordOpen} onOpenChange={setRecordOpen} form={recordForm} setForm={setRecordForm} onToggleSymptom={toggleSymptom} onSubmit={saveRecord} busy={isBusy} theme={profile.theme} />
      <DailyEntryDialog open={dailyOpen} onOpenChange={setDailyOpen} form={dailyForm} setForm={setDailyForm} onToggleSymptom={toggleDailySymptom} onSubmit={saveDaily} busy={isBusy} theme={profile.theme} />
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="dialog-content" dir="rtl" style={dialogThemeStyle(profile.theme)}><AlertDialogHeader><AlertDialogTitle>حذف سجل الدورة؟</AlertDialogTitle><AlertDialogDescription>سيُحذف سجل {deleteTarget ? formatDate(deleteTarget.startDate) : ""} نهائياً من ملفكِ الخاص. لا يمكن التراجع عن ذلك.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-rose-600 hover:bg-rose-700">حذف السجل</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={Boolean(deleteDailyTarget)} onOpenChange={open => !open && setDeleteDailyTarget(null)}>
        <AlertDialogContent className="dialog-content" dir="rtl" style={dialogThemeStyle(profile.theme)}><AlertDialogHeader><AlertDialogTitle>حذف متابعة هذا اليوم؟</AlertDialogTitle><AlertDialogDescription>سيُحذف المزاج والأعراض والملاحظة المسجلة ليوم {deleteDailyTarget ? formatDate(deleteDailyTarget.entryDate) : ""} من ملفكِ الخاص.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteDaily} className="bg-rose-600 hover:bg-rose-700">حذف المتابعة</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LoginPage() {
  const cache = useApiCache();
  const login = api.auth.login.useMutation();
  const register = api.auth.register.useMutation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const busy = login.isPending || register.isPending;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      const result = mode === "login"
        ? await login.mutateAsync({ email, password })
        : await register.mutateAsync({ name, email, password });
      cache.setQueryData(["auth.me"], result.user);
      await cache.invalidateQueries({ queryKey: ["auth.me"] });
      window.location.reload();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "تعذر فتح حسابكِ الآن. حاولي مرة أخرى.");
    }
  };

  return <div className="tracker-app login-page" data-theme="pink"><div className="surface-card login-card"><div className="login-content"><div className="brand-mark"><Flower2 size={25} /></div><h1>متابعة دورتكِ، بخصوصية وهدوء.</h1><p>أنشئي حساباً مستقلاً بزُهيرة. لا يلزم أي حساب خارجي.</p><div className="login-perks"><span><i><ShieldCheck size={15} /></i>بيانات منفصلة ومحميّة لكل حساب</span><span><i><CalendarDays size={15} /></i>سجل، تقويم، وتوقعات في مكان واحد</span><span><i><EyeOff size={15} /></i>وضع تخفي بواجهة محايدة عند الحاجة</span></div><form className="mt-5 grid gap-3" onSubmit={submit}>{mode === "register" && <input className="rounded-xl border border-black/10 bg-white/80 px-3 py-2.5 text-right text-sm" value={name} onChange={event => setName(event.target.value)} placeholder="الاسم الظاهر" autoComplete="name" required maxLength={80} />}<input className="rounded-xl border border-black/10 bg-white/80 px-3 py-2.5 text-right text-sm" value={email} onChange={event => setEmail(event.target.value)} placeholder="البريد الإلكتروني" autoComplete="email" required type="email" dir="ltr"/><input className="rounded-xl border border-black/10 bg-white/80 px-3 py-2.5 text-right text-sm" value={password} onChange={event => setPassword(event.target.value)} placeholder="كلمة المرور (8 أحرف على الأقل)" autoComplete={mode === "login" ? "current-password" : "new-password"} required type="password" minLength={8} dir="ltr"/>{error && <p role="alert" className="text-center text-xs text-red-700">{error}</p>}<button className="primary-button w-full" disabled={busy}><LogIn size={17} />{busy ? "جارٍ المتابعة…" : mode === "login" ? "تسجيل الدخول" : "إنشاء حساب"}</button></form><button type="button" className="mt-4 w-full text-center text-xs font-semibold text-[var(--primary)] underline underline-offset-4" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>{mode === "login" ? "ليس لديكِ حساب؟ أنشئي حساباً" : "لديكِ حساب بالفعل؟ سجّلي الدخول"}</button><p className="mt-4 text-center text-[.62rem]">كلمة المرور تُحفظ بصورة مشفرة ولا نطلب بيانات تسجيل دخول من أي خدمة أخرى.</p></div></div></div>;
}

function ProtectedDataError({ onRetry }: { onRetry: () => Promise<unknown> }) { return <div className="tracker-app login-page" data-theme="pink"><div className="surface-card login-card"><div className="login-content"><div className="brand-mark"><CloudOff size={25} /></div><h1>تعذر فتح بياناتكِ الآن</h1><p>لم نتمكن من الوصول إلى ملفكِ الخاص أو سجلات الدورة. لم يتم تعديل أو حذف أي بيانات.</p><button className="primary-button w-full mt-6" onClick={() => void onRetry()}><Activity size={17} />إعادة المحاولة</button></div></div></div>; }

function OnboardingPage(props: { onSubmit: (event: FormEvent) => void; name: string; setName: (value: string) => void; cycleLength: number; setCycleLength: (value: number) => void; lastPeriod: string; setLastPeriod: (value: string) => void; endDate: string; setEndDate: (value: string) => void; busy: boolean }) { return <div className="tracker-app onboarding-page" data-theme="pink"><form className="surface-card onboarding-card" onSubmit={props.onSubmit}><div className="brand-mark"><Sparkles size={24} /></div><h1 className="mt-4 text-[1.35rem] font-extrabold">لنجهز ملفكِ الخاص</h1><p className="mt-2 text-[.72rem] leading-7" style={{ color: "var(--muted)" }}>هذه الخطوات الأولى تساعدنا على إظهار تقديرات مناسبة. يمكنكِ تعديل كل البيانات لاحقاً من الإعدادات.</p><div className="form-stack"><div className="field"><label htmlFor="onboarding-name">الاسم الذي تفضلينه</label><input id="onboarding-name" value={props.name} onChange={event => props.setName(event.target.value)} placeholder="مثال: سارة" required /></div><div className="field"><label htmlFor="onboarding-cycle">متوسط طول الدورة (بالأيام)</label><input id="onboarding-cycle" type="number" min="20" max="45" value={props.cycleLength} onChange={event => props.setCycleLength(Number(event.target.value))} required /></div><div className="field"><label htmlFor="onboarding-start">أول يوم من آخر حيض</label><input id="onboarding-start" type="date" value={props.lastPeriod} max={dateKey(new Date())} onChange={event => props.setLastPeriod(event.target.value)} required /></div><div className="field"><label htmlFor="onboarding-end">آخر يوم للحيض <span className="font-normal">(اختياري)</span></label><input id="onboarding-end" type="date" value={props.endDate} min={props.lastPeriod} max={dateKey(new Date())} onChange={event => props.setEndDate(event.target.value)} /><span className="field-hint">اتركيه فارغاً إذا كان الحيض ما زال مستمراً؛ يمكنكِ إضافته لاحقاً.</span></div><button className="primary-button" disabled={props.busy} type="submit"><CheckCircle2 size={17} />{props.busy ? "جارٍ الحفظ..." : "إكمال الإعداد"}</button></div></form></div>; }

function StealthPage({ onReturn, busy }: { onReturn: () => void; busy: boolean }) { return <div className="stealth-page" dir="rtl"><div className="stealth-card"><div className="stealth-icon"><CloudOff size={27} /></div><h1>مساحة هادئة</h1><p>خذي وقتاً قصيراً للتركيز والتنفس. لا توجد تفاصيل شخصية معروضة في هذه الشاشة.</p><button className="secondary-button" onClick={onReturn} disabled={busy}><LockKeyholeIcon />العودة</button></div></div>; }
function LockKeyholeIcon() { return <ShieldCheck size={17} />; }

function HomeTab({ profileName, statistics, ongoingRecord, onAdd, onCloseOngoing, onRecords }: { profileName: string; statistics: ReturnType<typeof calculateCycleStatistics>; ongoingRecord: CycleRow | null; onAdd: () => void; onCloseOngoing: (record: CycleRow) => void; onRecords: () => void }) {
  return <><section className="surface-card hero"><div className="eyebrow"><Sparkles size={14} />مرحباً {profileName}</div><h2>{ongoingRecord ? `اليوم ${statistics.currentPeriodDay ?? 1} من الحيض الجاري` : "متابعة بسيطة تساعدكِ على فهم نمط دورتكِ"}</h2><p>التوقعات تتعلم من سجلاتكِ السابقة وتبقى تقديرية دائماً.</p></section><div className="stat-grid"><StatCard icon={<CalendarDays size={15} />} label="الدورة القادمة" value={formatDate(statistics.nextPeriodStart)} hint={`متوسط الدورة: ${statistics.averageCycleLength} يوم`} /><StatCard icon={<Flower2 size={15} />} label="نافذة الخصوبة" value={statistics.fertileStart ? `${formatDate(statistics.fertileStart)} — ${formatDate(statistics.fertileEnd)}` : "أضيفي سجلاً للبدء"} hint="توقع تقريبي وليس تشخيصاً" /><StatCard icon={<Droplets size={15} />} label="متوسط الحيض" value={statistics.averagePeriodDuration ? `${statistics.averagePeriodDuration} أيام` : "تحتاج سجلات مكتملة"} hint="يُحسب من الدورات المنتهية" /><StatCard icon={<Activity size={15} />} label="موعد الإباضة" value={formatDate(statistics.ovulationDate)} hint="قبل الدورة المتوقعة بـ14 يوماً" /></div><div className="main-layout"><section className="section"><div className="section-header"><div><h2>آخر حالة</h2><p>إدارة سريعة لسجل الحيض</p></div></div>{ongoingRecord ? <div className="surface-card ongoing-card"><div className="ongoing-status"><div className="status-orb"><Droplets size={19} /></div><div><h3>حيض مستمر منذ {formatDate(ongoingRecord.startDate)}</h3><p>المدة حتى الآن {statistics.currentPeriodDay ?? 1} أيام. عند انتهائه، أضيفي تاريخ النهاية ليُحتسب متوسط المدة بدقة.</p></div></div><button className="secondary-button" onClick={() => onCloseOngoing(ongoingRecord)}><CheckCircle2 size={16} />إضافة تاريخ النهاية</button></div> : <div className="surface-card ongoing-card"><div className="ongoing-status"><div className="status-orb"><Plus size={19} /></div><div><h3>لا يوجد حيض مستمر</h3><p>يمكنكِ تسجيل أول يوم الآن أو إضافة دورة سابقة مكتملة من السجل.</p></div></div><button className="primary-button" onClick={onAdd}><Plus size={16} />تسجيل دورة</button></div>}</section><section className="section"><div className="section-header"><div><h2>السجل</h2><p>راجعي الدورات السابقة</p></div><button className="text-button" onClick={onRecords}>عرض السجل</button></div><div className="surface-card p-3"><p className="m-0 text-[.68rem] leading-7" style={{ color: "var(--muted)" }}>كلما أضفتِ دورات مكتملة أكثر، أصبحت توقعات متوسط الدورة ومدة الحيض أكثر ارتباطاً بسجلكِ الشخصي.</p></div></section></div></>;
}
function StatCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) { return <div className="surface-card stat-card"><span className="stat-label">{icon}{label}</span><strong>{value}</strong><small>{hint}</small></div>; }

function RecordsTab({ cycles, onAdd, onEdit, onDelete, onCloseOngoing }: { cycles: CycleRow[]; onAdd: () => void; onEdit: (record: CycleRow) => void; onDelete: (record: CycleRow) => void; onCloseOngoing: (record: CycleRow) => void }) { return <section className="surface-card page-card"><div className="section-header"><div><h2>سجل الدورات</h2><p>يمكنكِ تعديل أي سجل أو حذفه بعد التأكيد.</p></div><button className="primary-button" onClick={onAdd}><Plus size={16} />إضافة</button></div><div className="record-list">{cycles.length ? cycles.map(record => <div className="surface-card record-row" key={record.id}><div className="record-copy"><h3>{formatDate(record.startDate)} {record.endDate ? `— ${formatDate(record.endDate)}` : "— مستمرة"}</h3><p>{record.endDate ? `المدة: ${Math.round((new Date(`${record.endDate}T12:00:00`).getTime() - new Date(`${record.startDate}T12:00:00`).getTime()) / 86400000) + 1} أيام` : "لم يُسجل آخر يوم بعد"}{record.symptoms.length ? ` • ${record.symptoms.join("، ")}` : ""}</p>{record.notes && <p>{record.notes}</p>}<span className={`badge ${record.endDate ? "complete" : ""}`}>{record.endDate ? "مكتملة" : "مستمرة"}</span></div><div className="record-actions">{!record.endDate && <button className="mini-action complete-action" aria-label="إضافة تاريخ نهاية الحيض" onClick={() => onCloseOngoing(record)}><CheckCircle2 size={16} /></button>}<button className="mini-action edit-action" aria-label="تعديل السجل" onClick={() => onEdit(record)}><Pencil size={15} /></button><button className="mini-action delete" aria-label="حذف السجل" onClick={() => onDelete(record)}><Trash2 size={15} /></button></div></div>) : <div className="empty-state">لا توجد دورات مسجلة بعد. أضيفي أول سجل لبدء التوقعات.</div>}</div></section>; }

function DailyLogPanel({ entryDate, entry, onOpen, onDelete }: { entryDate: string; entry: DailyEntryRow | null; onOpen: () => void; onDelete: (entry: DailyEntryRow) => void }) { const mood = entry ? moodOptions.find(option => option.value === entry.mood) : null; return <section className="surface-card page-card daily-log-panel"><div className="section-header"><div><h2>متابعة يومكِ</h2><p>{formatDate(entryDate)}</p></div>{entry && <span className={`mood-pill mood-${entry.mood}`}>{mood?.emoji} {mood?.label}</span>}</div>{entry ? <><p className="daily-panel-copy">{entry.symptoms.length ? `الأعراض المسجلة: ${entry.symptoms.join("، ")}` : "لم تُسجل أعراض لهذا اليوم."}</p>{entry.notes && <p className="daily-panel-copy">ملاحظتكِ: {entry.notes}</p>}<div className="day-actions"><button className="secondary-button" onClick={onOpen}><Pencil size={15} />تعديل المتابعة</button><button className="mini-action delete" aria-label="حذف متابعة اليوم" onClick={() => onDelete(entry)}><Trash2 size={15} /></button></div></> : <><p className="daily-panel-copy">سجلي مزاجكِ أو الأعراض التي لاحظتها اليوم لتكوين صورة أوضح عن نمطكِ الشخصي.</p><button className="primary-button" onClick={onOpen}><Plus size={16} />إضافة متابعة يومية</button></>}</section>; }

function CalendarTab({ cursor, setCursor, selectedDay, setSelectedDay, periodDays, fertileDays, cycles, dailyEntries, today }: { cursor: Date; setCursor: (date: Date) => void; selectedDay: string; setSelectedDay: (date: string) => void; periodDays: Set<string>; fertileDays: Set<string>; cycles: CycleRow[]; dailyEntries: DailyEntryRow[]; today: string }) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const totalDays = new Date(year, month + 1, 0).getDate();
  const dailyByDate = new Map(dailyEntries.map(entry => [entry.entryDate, entry]));
  const selectedRecord = cycles.find(record => selectedDay >= record.startDate && selectedDay <= (record.endDate ?? today));
  const selection = selectedRecord ? `حيض ${selectedRecord.endDate ? "مسجل" : "مستمر"} في هذا اليوم.` : fertileDays.has(selectedDay) ? "هذا اليوم ضمن نافذة الخصوبة المتوقعة." : "لا يوجد سجل أو توقع خاص لهذا اليوم.";

  return <section className="surface-card page-card"><div><h2>التقويم الشهري</h2><p>اضغطي على أي يوم لرؤية ملخصه أو تسجيل متابعة يومية.</p></div><div className="calendar-head"><div className="calendar-nav"><button aria-label="الشهر السابق" onClick={() => setCursor(new Date(year, month - 1, 1))}><ChevronRight size={17} /></button><button aria-label="الشهر التالي" onClick={() => setCursor(new Date(year, month + 1, 1))}><ChevronLeft size={17} /></button></div><h3>{monthNames[month]} {year}</h3></div><div className="weekday-grid">{weekdays.map(day => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{Array.from({ length: firstOffset }).map((_, index) => <span className="calendar-blank" key={`blank-${index}`} />)}{Array.from({ length: totalDays }).map((_, index) => { const day = index + 1; const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`; const entry = dailyByDate.get(key); const className = `calendar-day ${periodDays.has(key) ? "period" : ""} ${fertileDays.has(key) ? "fertile" : ""} ${entry ? "daily" : ""} ${key === today ? "today" : ""} ${key === selectedDay ? "selected" : ""}`; return <button key={key} className={className} onClick={() => setSelectedDay(key)} aria-label={`${formatDate(key)}${entry ? "، توجد متابعة يومية" : ""}`}>{day}{entry && <span className={`daily-dot mood-${entry.mood}`} aria-hidden="true" />}</button>; })}</div><div className="legend"><span><i />أيام الحيض</span><span><i className="fertile-dot" />الخصوبة المتوقعة</span><span><i className="daily-dot mood-good" />متابعة المزاج والأعراض</span><span><i className="today-dot" />اليوم</span></div><div className="day-detail"><strong>{formatDate(selectedDay)}</strong><br />{selection}</div></section>;
}

function ChatTab({ messages, input, setInput, onSubmit }: { messages: ChatMessage[]; input: string; setInput: (value: string) => void; onSubmit: (event: FormEvent) => void }) { return <section className="surface-card page-card"><div className="section-header"><div><h2>مساعد زُهيرة</h2><p>إرشادات عامة تعمل دون اتصال</p></div><MessageCircle size={21} color="var(--accent)" /></div><div className="chat-disclaimer"><CircleHelp size={17} className="shrink-0 mt-0.5" />هذا المساعد ليس أداة طبية ولا يقدّم تشخيصاً أو علاجاً. عند ألم شديد، نزيف غير معتاد، أو قلق مستمر، تواصلي مع مختصة أو اطلبي الرعاية العاجلة.</div><div className="chat-log" aria-live="polite">{messages.map(message => <div key={message.id} className={`chat-bubble ${message.role === "user" ? "user" : ""}`}>{message.text}</div>)}</div><form className="chat-composer" onSubmit={onSubmit}><input value={input} onChange={event => setInput(event.target.value)} placeholder="اكتبي سؤالك هنا..." aria-label="سؤال للمساعد" /><button type="submit" aria-label="إرسال السؤال"><Send size={17} /></button></form></section>; }

function SettingsWorkspace({ active, onChange, children }: { active: SettingsSection; onChange: (section: SettingsSection) => void; children: React.ReactNode }) {
  const sections: { id: SettingsSection; label: string; hint: string; icon: React.ReactNode }[] = [
    { id: "profile", label: "ملفي", hint: "الاسم والدورة", icon: <UserRound size={17} /> },
    { id: "preferences", label: "التفضيلات", hint: "اللغة والمظهر", icon: <Settings size={17} /> },
    { id: "wellbeing", label: "المتابعة", hint: "مرحلة الحياة", icon: <HeartPulse size={17} /> },
    { id: "data", label: "البيانات", hint: "تقارير ونسخ", icon: <CalendarDays size={17} /> },
    { id: "security", label: "الأمان", hint: "الحساب والخصوصية", icon: <ShieldCheck size={17} /> },
  ];
  const current = sections.find(section => section.id === active)!;
  return <section className="settings-workspace" aria-label="إعدادات التطبيق"><div className="settings-workspace-head"><div><span>إعدادات زُهيرة</span><h2>{current.label}</h2><p>{current.hint}</p></div><div className="settings-workspace-icon">{current.icon}</div></div><nav className="settings-section-tabs" aria-label="أقسام الإعدادات">{sections.map(section => <button key={section.id} className={active === section.id ? "active" : ""} type="button" onClick={() => onChange(section.id)} aria-current={active === section.id ? "page" : undefined}>{section.icon}<span>{section.label}</span></button>)}</nav><div className="settings-section-content">{children}</div></section>;
}

function SettingsTab({ name, setName, cycleLength, setCycleLength, profile, latestRecord, onSubmit, onTheme, onLanguage, onStealth, onEditLatest, busy, compact = false, preferencesOnly = false }: { name: string; setName: (value: string) => void; cycleLength: number; setCycleLength: (value: number) => void; profile: ProfileData; latestRecord: CycleRow | null; onSubmit: (event: FormEvent) => void; onTheme: (theme: ThemeName) => void; onLanguage: (language: AppLanguage) => void; onStealth: () => void; onEditLatest: () => void; onLogout: () => void; busy: boolean; compact?: boolean; preferencesOnly?: boolean }) { return <section className="surface-card page-card settings-core-card">{!preferencesOnly && <><div><h2>بيانات المتابعة</h2><p>عدّلي بيانات ملفكِ ومتوسط الدورة المسجل في حسابكِ.</p></div><form className="form-stack" onSubmit={onSubmit}><div className="field"><label>الاسم المعروض</label><input value={name} onChange={event => setName(event.target.value)} /></div><div className="field"><label>متوسط طول الدورة</label><input type="number" min="20" max="45" value={cycleLength} onChange={event => setCycleLength(Number(event.target.value))} /></div><button className="secondary-button" type="submit" disabled={busy}><UserRound size={16} />حفظ الملف الشخصي</button></form><div className="settings-group"><h3>آخر حيض مسجل</h3><p>{latestRecord ? `بدأ في ${formatDate(latestRecord.startDate)}. يمكنكِ تعديل البداية أو إضافة تاريخ النهاية من هنا.` : "لا يوجد سجل حتى الآن. أضيفي أول يوم لبدء المتابعة."}</p><button className="secondary-button" type="button" onClick={onEditLatest}>{latestRecord ? <><Pencil size={16} />تعديل آخر حيض</> : <><Plus size={16} />إضافة آخر حيض</>}</button></div></>}{!compact && <><div className="settings-group"><h3>اللغة</h3><p>اختاري لغة التطبيق واتجاه الواجهة المناسبين لكِ.</p><div className="theme-grid language-grid"><button type="button" className={`theme-button ${profile.language === "ar" ? "selected" : ""}`} onClick={() => onLanguage("ar")} disabled={busy}>العربية</button><button type="button" className={`theme-button ${profile.language === "en" ? "selected" : ""}`} onClick={() => onLanguage("en")} disabled={busy}>الإنجليزية</button></div></div><div className="settings-group"><h3>ثيم التطبيق</h3><p>اختاري أحد الألوان التالية. يتم حفظ الاختيار في حسابكِ.</p><div className="theme-grid">{themes.map(theme => <button type="button" key={theme.value} className={`theme-button ${profile.theme === theme.value ? "selected" : ""}`} onClick={() => onTheme(theme.value)} disabled={busy}><i className={`theme-swatch ${theme.className}`} />{theme.label}</button>)}</div></div><div className="settings-group"><h3>وضع التخفي</h3><p>يعرض شاشة محايدة لا تحتوي على أي تفاصيل عن الدورة أو التطبيق.</p><div className="toggle-row"><div><strong>تفعيل وضع التخفي</strong><span>يمكنكِ العودة إلى التطبيق من الشاشة المحايدة.</span></div><button className="switch" type="button" aria-label="تفعيل وضع التخفي" onClick={onStealth} disabled={busy}><i /></button></div></div></>}</section>; }

function Navigation({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) { const items: { id: Tab; label: string; icon: React.ReactNode }[] = [{ id: "home", label: "الرئيسية", icon: <HeartPulse size={18} /> }, { id: "records", label: "السجل", icon: <Droplets size={18} /> }, { id: "calendar", label: "التقويم", icon: <CalendarDays size={18} /> }, { id: "medications", label: "الأدوية", icon: <Pill size={18} /> }, { id: "chat", label: "المساعد", icon: <MessageCircle size={18} /> }, { id: "settings", label: "الإعدادات", icon: <Settings size={18} /> }]; return <nav className="bottom-nav" aria-label="التنقل الرئيسي"><div className="bottom-nav-inner">{items.map(item => <button key={item.id} className={`nav-item ${active === item.id ? "active" : ""}`} onClick={() => onChange(item.id)}>{item.icon}<span>{item.label}</span></button>)}</div></nav>; }

function DailyEntryDialog({ open, onOpenChange, form, setForm, onToggleSymptom, onSubmit, busy, theme }: { open: boolean; onOpenChange: (open: boolean) => void; form: DailyFormState; setForm: React.Dispatch<React.SetStateAction<DailyFormState>>; onToggleSymptom: (symptom: string) => void; onSubmit: (event: FormEvent) => void; busy: boolean; theme: ThemeName }) {
  const isEdit = Boolean(form.id);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="dialog-content" dir="rtl" style={dialogThemeStyle(theme)}><DialogHeader><DialogTitle>{isEdit ? "تعديل متابعة اليوم" : "متابعة يومية"}</DialogTitle><DialogDescription>سجلي مزاجكِ والأعراض والقياسات التي ترغبين في متابعتها. جميعها اختيارية ومحفوظة لحسابكِ فقط.</DialogDescription></DialogHeader><form className="form-stack" onSubmit={onSubmit}><div className="field"><label>اليوم المختار</label><input type="date" value={form.entryDate} disabled /></div><div className="field"><label>كيف كان مزاجكِ؟</label><div className="mood-grid">{moodOptions.map(option => <button type="button" key={option.value} className={`mood-choice ${form.mood === option.value ? "selected" : ""}`} onClick={() => setForm(current => ({ ...current, mood: option.value }))}><span>{option.emoji}</span>{option.label}</button>)}</div></div><div className="field"><label>مستوى الطاقة</label><div className="choice-grid">{[1, 2, 3, 4, 5].map(level => <button key={level} type="button" className={form.energyLevel === level ? "profile-choice selected" : "profile-choice"} onClick={() => setForm(current => ({ ...current, energyLevel: level }))}>{level} / 5</button>)}</div></div><div className="field"><label>أعراض اليوم <span className="font-normal">(اختياري)</span></label><div className="symptom-grid">{dailySymptomOptions.map(symptom => <label key={symptom} className="symptom-choice"><input type="checkbox" checked={form.symptoms.includes(symptom)} onChange={() => onToggleSymptom(symptom)} />{symptom}</label>)}</div><input className="mt-2" value={form.customSymptoms.join("، ")} onChange={event => setForm(current => ({ ...current, customSymptoms: event.target.value.split(/[,،]/).map(item => item.trim()).filter(Boolean).slice(0, 8) }))} placeholder="أعراض أخرى مفصولة بفاصلة (اختياري)" /></div><div className="field"><label>قياسات اختيارية</label><div className="form-grid"><input type="number" min="20" max="300" step="0.1" value={form.weightKg ?? ""} onChange={event => setForm(current => ({ ...current, weightKg: event.target.value === "" ? null : Number(event.target.value) }))} placeholder="الوزن كجم" /><input type="number" min="34" max="43" step="0.01" value={form.basalTemperature ?? ""} onChange={event => setForm(current => ({ ...current, basalTemperature: event.target.value === "" ? null : Number(event.target.value) }))} placeholder="الحرارة الأساسية °C" /></div></div><div className="field"><label>ملاحظات الخصوبة <span className="font-normal">(اختياري)</span></label><div className="form-stack compact"><select value={form.cervicalMucus} onChange={event => setForm(current => ({ ...current, cervicalMucus: event.target.value as FertilityMucus }))}><option value="not_observed">مخاط عنق الرحم: لم ألاحظ</option><option value="dry">جاف</option><option value="sticky">لزج</option><option value="creamy">كريمي</option><option value="watery">مائي</option><option value="egg_white">شفاف ومطاطي</option></select><select value={form.opkResult} onChange={event => setForm(current => ({ ...current, opkResult: event.target.value as TestResult }))}><option value="not_taken">اختبار تبويض: لم أجره</option><option value="negative">اختبار تبويض: سلبي</option><option value="positive">اختبار تبويض: إيجابي</option><option value="unclear">اختبار تبويض: غير واضح</option></select><select value={form.pregnancyTest} onChange={event => setForm(current => ({ ...current, pregnancyTest: event.target.value as TestResult }))}><option value="not_taken">اختبار حمل: لم أجره</option><option value="negative">اختبار حمل: سلبي</option><option value="positive">اختبار حمل: إيجابي</option><option value="unclear">اختبار حمل: غير واضح</option></select></div></div><div className="field"><label>ملاحظة خاصة <span className="font-normal">(اختياري)</span></label><textarea value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} placeholder="مثال: ساعدني النوم المبكر اليوم" maxLength={1000} /></div><button className="primary-button" disabled={busy} type="submit"><CheckCircle2 size={16} />{busy ? "جارٍ الحفظ..." : isEdit ? "حفظ التعديل" : "حفظ متابعة اليوم"}</button></form></DialogContent></Dialog>;
}

function RecordDialog({ open, onOpenChange, form, setForm, onToggleSymptom, onSubmit, busy, theme }: { open: boolean; onOpenChange: (open: boolean) => void; form: RecordFormState; setForm: React.Dispatch<React.SetStateAction<RecordFormState>>; onToggleSymptom: (symptom: string) => void; onSubmit: (event: FormEvent) => void; busy: boolean; theme: ThemeName }) {
  const isEdit = Boolean(form.id);
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="dialog-content cycle-dialog" dir="rtl" style={dialogThemeStyle(theme)}>
      <DialogHeader className="cycle-dialog-header">
        <DialogTitle>{isEdit ? "تعديل سجل الدورة" : "تسجيل دورة جديدة"}</DialogTitle>
        <DialogDescription>أضيفي تاريخ البداية، واتركي تاريخ النهاية فارغاً إذا كان الحيض مستمراً.</DialogDescription>
      </DialogHeader>
      <div className="cycle-dialog-scroll">
        <form className="form-stack cycle-dialog-form" onSubmit={onSubmit}>
          <div className="field"><label>أول يوم لنزول الدم</label><input type="date" max={dateKey(new Date())} value={form.startDate} onChange={event => setForm(current => ({ ...current, startDate: event.target.value }))} required /></div>
          <div className="field"><label>آخر يوم للحيض <span className="font-normal">(اختياري)</span></label><input type="date" min={form.startDate} max={dateKey(new Date())} value={form.endDate} onChange={event => setForm(current => ({ ...current, endDate: event.target.value }))} /><span className="field-hint">{form.endDate ? "سيُعامل السجل كدورة مكتملة." : "سيظهر السجل كحيض مستمر ويمكن إغلاقه لاحقاً."}</span></div>
          <div className="field"><label>كمية النزيف المعتادة لهذه الدورة</label><div className="choice-grid"><button type="button" className={form.flowVolume === "light" ? "profile-choice selected" : "profile-choice"} onClick={() => setForm(current => ({ ...current, flowVolume: "light" }))}>خفيف</button><button type="button" className={form.flowVolume === "medium" ? "profile-choice selected" : "profile-choice"} onClick={() => setForm(current => ({ ...current, flowVolume: "medium" }))}>متوسط</button><button type="button" className={form.flowVolume === "heavy" ? "profile-choice selected" : "profile-choice"} onClick={() => setForm(current => ({ ...current, flowVolume: "heavy" }))}>كثير</button></div></div>
          <div className="field"><label>أعراض مرافقة <span className="font-normal">(اختياري)</span></label><div className="symptom-grid">{symptomOptions.map(symptom => <label key={symptom} className="symptom-choice"><input type="checkbox" checked={form.symptoms.includes(symptom)} onChange={() => onToggleSymptom(symptom)} />{symptom}</label>)}</div></div>
          <div className="field"><label>ملاحظات خاصة <span className="font-normal">(اختياري)</span></label><textarea value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} placeholder="مثال: ألم أخف من المعتاد" maxLength={1000} /></div>
          <button className="primary-button cycle-dialog-submit" disabled={busy} type="submit"><CheckCircle2 size={16} />{busy ? "جارٍ الحفظ..." : isEdit ? "حفظ التعديل" : "حفظ السجل"}</button>
        </form>
      </div>
    </DialogContent>
  </Dialog>;
}
