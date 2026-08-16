import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getActiveClinicianShareByToken } from "../../../server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function SharedClinicianReport({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const share = await getActiveClinicianShareByToken(token);
  if (!share) notFound();
  const { report } = share;
  return <main dir="rtl" lang="ar" style={{ maxWidth: 700, margin: "0 auto", padding: "32px 20px", fontFamily: "Arial, sans-serif", lineHeight: 1.8, color: "#2b2432" }}>
    <header style={{ borderBottom: "2px solid #f2c6d6", paddingBottom: 16, marginBottom: 24 }}><p style={{ color: "#a23f61", margin: 0 }}>زُهيرة</p><h1 style={{ margin: "4px 0" }}>{report.title}</h1><p style={{ margin: 0, color: "#665d68" }}>صالح للعرض حتى {new Date(share.expiresAt).toLocaleString("ar-EG")}</p></header>
    {report.profile && <section><h2>ملخص المتابعة</h2><p><strong>الاسم:</strong> {report.profile.displayName}</p><p><strong>متوسط طول الدورة:</strong> {report.profile.averageCycleLength} يوم</p><p><strong>أيام النزف المعتادة:</strong> {report.profile.typicalBleedingDays} يوم</p><p><strong>وضع محاولة الحمل:</strong> {report.profile.tryingToConceive ? "مفعّل" : "غير مفعّل"}</p></section>}
    <section><h2>الدورات</h2><p>الدورات المسجلة: {report.cycleSummary.recordedCycles}، وآخر بداية مسجلة: {report.cycleSummary.latestStartDate ?? "لا يوجد"}، والدورات المستمرة: {report.cycleSummary.ongoingCycles}.</p></section>
    <section><h2>المتابعة اليومية</h2><p>الأيام المسجلة: {report.wellbeingSummary.recordedDays}، ومتوسط شدة الألم المسجل: {report.wellbeingSummary.averagePainLevel ?? "لا توجد بيانات"}.</p><p><strong>الأعراض الأكثر تكراراً:</strong> {report.wellbeingSummary.mostCommonSymptoms.join("، ") || "لا توجد بيانات كافية"}</p></section>
    <section><h2>الالتزام الدوائي</h2><p>عدد الأدوية النشطة: {report.medicationSummary.activeMedicationCount}، والجرعات المؤكدة في السجل: {report.medicationSummary.confirmedDoses}.</p></section>
    <footer style={{ marginTop: 32, padding: 16, background: "#fff5f8", borderRadius: 12 }}>{report.notice}</footer>
  </main>;
}
