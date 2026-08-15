import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DailyHealthPanel, ProfileHealthPanel, ReferenceStatsPanel } from "../client/src/components/ReferenceFeaturePanels";
import { languageDocumentAttributes } from "../client/src/components/LanguageController";
import { appLockInput, cycleInput, dailyEntryInput, medicationInput, profileInput } from "../lib/validation";

describe("Next.js API validation", () => {
  it("rejects an invalid cycle date range before it reaches the database", () => {
    const result = cycleInput.safeParse({ startDate: "2026-08-10", endDate: "2026-08-09", symptoms: [], notes: null });
    expect(result.success).toBe(false);
  });

  it("limits daily pain values and allows the extended mood values", () => {
    expect(dailyEntryInput.safeParse({ entryDate: "2026-08-14", mood: "anxious", painLevel: 4, symptoms: ["إرهاق"], notes: null }).success).toBe(true);
    expect(dailyEntryInput.safeParse({ entryDate: "2026-08-14", mood: "good", painLevel: 5, symptoms: [], notes: null }).success).toBe(false);
  });

  it("requires complete profile values for an authenticated update", () => {
    expect(profileInput.safeParse({ displayName: "سارة", averageCycleLength: 28, typicalBleedingDays: 5, relationshipStatus: "single", pregnancyStatus: "not_pregnant", theme: "pink", language: "ar", stealthMode: false, onboardingCompleted: true }).success).toBe(true);
    expect(profileInput.safeParse({ displayName: "", averageCycleLength: 28 }).success).toBe(false);
  });

  it("validates private medication schedules and numeric privacy-lock pins", () => {
    expect(medicationInput.safeParse({ name: "دواء مسجل", dosage: "قرص واحد", notes: null, reminderTimes: ["18:00", "09:00", "09:00"], isActive: true }).success).toBe(true);
    expect(medicationInput.safeParse({ name: "دواء", dosage: "قرص", notes: null, reminderTimes: ["25:00"], isActive: true }).success).toBe(false);
    expect(appLockInput.safeParse({ pin: "1234" }).success).toBe(true);
    expect(appLockInput.safeParse({ pin: "12ab" }).success).toBe(false);
  });

  it("switches the document language and reading direction for English and Arabic", () => {
    expect(languageDocumentAttributes("en")).toEqual({ lang: "en", dir: "ltr" });
    expect(languageDocumentAttributes("ar")).toEqual({ lang: "ar", dir: "rtl" });
  });

  it("renders the new health panels with the stored pain, preferences, and entries", () => {
    const dailyPanel = renderToStaticMarkup(<DailyHealthPanel entryDate="2026-08-14" entry={{ id: 1, entryDate: "2026-08-14", mood: "anxious", painLevel: 3, symptoms: ["إرهاق"], notes: null }} busy={false} onSave={async () => undefined} onDelete={() => undefined} />);
    const profilePanel = renderToStaticMarkup(<ProfileHealthPanel profile={{ typicalBleedingDays: 5, relationshipStatus: "single", pregnancyStatus: "not_pregnant" }} busy={false} onSave={async () => undefined} />);
    const insightsPanel = renderToStaticMarkup(<ReferenceStatsPanel cycles={[{ id: 1, startDate: "2026-08-01", endDate: "2026-08-05" }]} dailyEntries={[{ id: 1, entryDate: "2026-08-14", mood: "anxious", painLevel: 3, symptoms: ["إرهاق"], notes: null }]} />);
    expect(dailyPanel).toContain("الألم: مزعج");
    expect(profilePanel).toContain("تفضيلات المتابعة");
    expect(insightsPanel).toContain("إحصاءاتكِ");
  });
});
