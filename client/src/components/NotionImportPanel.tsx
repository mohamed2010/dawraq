"use client";

import { api, type CycleInput } from "@/lib/api";
import { CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
import { ChangeEvent, useMemo, useState } from "react";
import { toast } from "sonner";

type ExistingCycle = CycleInput & { id: number };
type ImportRow = CycleInput & { key: string; selected: boolean; duplicate: boolean; source: string };

function csvRows(value: string) {
  const rows: string[][] = [];
  let cell = ""; let row: string[] = []; let quoted = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === '"' && value[index + 1] === '"') { cell += '"'; index += 1; continue; }
    if (character === '"') { quoted = !quoted; continue; }
    if (character === "," && !quoted) { row.push(cell.trim()); cell = ""; continue; }
    if ((character === "\n" || character === "\r") && !quoted) { if (character === "\r" && value[index + 1] === "\n") index += 1; row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = ""; continue; }
    cell += character;
  }
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row);
  return rows;
}

function normalizeHeader(value: string) { return value.trim().toLowerCase().replace(/[ _-]/g, ""); }
function dateValue(value: string) {
  const match = value.trim().match(/(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (match) return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  const arabicOrSlash = value.trim().match(/(\d{1,2})[/.](\d{1,2})[/.](20\d{2})/);
  if (arabicOrSlash) return `${arabicOrSlash[3]}-${arabicOrSlash[2].padStart(2, "0")}-${arabicOrSlash[1].padStart(2, "0")}`;
  return null;
}
export function parseNotionExport(value: string, existing: ExistingCycle[]): ImportRow[] {
  const rows = csvRows(value);
  if (rows.length < 2) return [];
  const headers = rows[0].map(normalizeHeader);
  const byHeader = (parts: string[]) => headers.findIndex(header => parts.some(part => header.includes(part)));
  const rangeIndex = byHeader(["date", "period", "الدورة", "التاريخ"]);
  const startIndex = byHeader(["start", "بداية", "أول"]);
  const endIndex = byHeader(["end", "نهاية", "آخر"]);
  const notesIndex = byHeader(["note", "notes", "ملاحظة", "وصف"]);
  const known = new Set(existing.map(item => `${item.startDate}|${item.endDate ?? ""}`));
  return rows.slice(1).flatMap((columns, index) => {
    const range = rangeIndex >= 0 ? columns[rangeIndex] ?? "" : "";
    const foundDates = [...range.matchAll(/20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[/.]\d{1,2}[/.]20\d{2}/g)].map(match => dateValue(match[0])).filter((item): item is string => Boolean(item));
    const startDate = (startIndex >= 0 ? dateValue(columns[startIndex] ?? "") : null) ?? foundDates[0] ?? null;
    const endDate = (endIndex >= 0 ? dateValue(columns[endIndex] ?? "") : null) ?? foundDates[1] ?? null;
    if (!startDate || (endDate && endDate < startDate)) return [];
    const key = `${startDate}|${endDate ?? ""}`;
    const duplicate = known.has(key);
    return [{ key: `${key}-${index}`, startDate, endDate, symptoms: [], flowVolume: "medium" as const, notes: notesIndex >= 0 ? columns[notesIndex] || null : null, selected: !duplicate, duplicate, source: columns.join(" • ") }];
  });
}

export function NotionImportPanel({ cycles, onImported }: { cycles: ExistingCycle[]; onImported: () => Promise<unknown> }) {
  const createCycle = api.cycles.create.useMutation();
  const [raw, setRaw] = useState("");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const preview = (value = raw) => { const parsed = parseNotionExport(value, cycles); setRows(parsed); if (!parsed.length) toast.error("لم نجد تواريخ صالحة. استخدمي CSV يحتوي على تاريخ بداية، وتاريخ نهاية اختياري."); };
  const readFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { const text = String(reader.result ?? ""); setRaw(text); preview(text); };
    reader.readAsText(file, "utf-8");
  };
  const selected = useMemo(() => rows.filter(row => row.selected && !row.duplicate), [rows]);
  const importSelected = async () => {
    if (!selected.length) return toast.error("اختاري سجلاً صالحاً واحداً على الأقل.");
    try {
      for (const row of selected) await createCycle.mutateAsync({ startDate: row.startDate, endDate: row.endDate, symptoms: [], flowVolume: row.flowVolume, notes: row.notes });
      await onImported();
      setRows([]); setRaw("");
      toast.success(`تم استيراد ${selected.length} سجل/سجلات إلى حسابكِ.`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر استيراد السجلات الآن. لم تُحذف بيانات المصدر."); }
  };
  return <section className="surface-card page-card enhancement-panel" dir="rtl"><div className="section-header"><div><h2>استيراد سجلات Notion القديمة</h2><p>اختاري تصدير CSV من Notion أو الصقي الجدول هنا. لن يُحفظ أي شيء قبل مراجعتكِ واختياركِ للسجلات.</p></div><FileSpreadsheet size={21} color="var(--purple)" /></div><div className="settings-group"><p>يفهم الاستيراد الأعمدة التي تتضمن: <strong>تاريخ/Date</strong> أو <strong>بداية/Start</strong> و<strong>نهاية/End</strong>، مع ملاحظة اختيارية. الصفوف المتكررة تُعلَّم ولا تُحدَّد تلقائياً.</p><label className="secondary-button upload-label"><Upload size={16} />اختيار ملف CSV من Notion<input type="file" accept=".csv,text/csv,text/plain" onChange={readFile} /></label><div className="field"><label htmlFor="notion-paste">أو الصقي نص CSV</label><textarea id="notion-paste" value={raw} onChange={event => setRaw(event.target.value)} placeholder={'Date,End,Notes\n2025-03-01,2025-03-05,سجل قديم'} /></div><button className="secondary-button" type="button" onClick={() => preview()}>معاينة السجلات</button>{rows.length > 0 && <div className="record-list">{rows.map(row => <label className="notification-card" key={row.key}><input type="checkbox" checked={row.selected} disabled={row.duplicate} onChange={event => setRows(current => current.map(item => item.key === row.key ? { ...item, selected: event.target.checked } : item))} /><div><strong>{row.startDate}{row.endDate ? ` — ${row.endDate}` : " — مستمرة"}</strong><span>{row.duplicate ? "سجل مشابه موجود بالفعل في حسابكِ." : row.notes || "لا توجد ملاحظة"}</span></div></label>)}</div>}{rows.length > 0 && <button className="primary-button" type="button" disabled={!selected.length || createCycle.isPending} onClick={() => void importSelected()}><CheckCircle2 size={16} />{createCycle.isPending ? "جارٍ الاستيراد..." : `استيراد ${selected.length} سجل/سجلات مختارة`}</button>}</div></section>;
}
