import { z } from "zod";

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeKey = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const email = z.string().trim().toLowerCase().email().max(320);
const password = z.string().min(8, "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.").max(128);
export const registerInput = z.object({ name: z.string().trim().min(1).max(80), email, password });
export const loginInput = z.object({ email, password: z.string().min(1).max(128) });
export const profileInput = z.object({ displayName: z.string().trim().min(1).max(80), averageCycleLength: z.number().int().min(20).max(45), typicalBleedingDays: z.number().int().min(1).max(14), relationshipStatus: z.enum(["single", "married"]), pregnancyStatus: z.enum(["not_pregnant", "pregnant", "not_sure"]), theme: z.enum(["light", "dark", "pink", "purple"]), language: z.enum(["ar", "en"]), tryingToConceive: z.boolean().default(false), stealthMode: z.boolean(), onboardingCompleted: z.boolean() });
export const cycleInput = z.object({ startDate: dateKey, endDate: dateKey.nullable(), symptoms: z.array(z.string().min(1).max(40)).max(8), flowVolume: z.enum(["light", "medium", "heavy"]).default("medium"), notes: z.string().max(1000).nullable() }).superRefine((value, ctx) => { if (value.endDate && value.endDate < value.startDate) ctx.addIssue({ code: "custom", path: ["endDate"], message: "تاريخ النهاية يسبق البداية." }); });
export const dailyEntryInput = z.object({ entryDate: dateKey, mood: z.enum(["very_low", "low", "neutral", "good", "great", "irritable", "anxious"]), painLevel: z.number().int().min(0).max(4), symptoms: z.array(z.string().min(1).max(40)).max(10), customSymptoms: z.array(z.string().trim().min(1).max(40)).max(8).default([]), energyLevel: z.number().int().min(1).max(5).default(3), weightKg: z.number().min(20).max(300).nullable().default(null), basalTemperature: z.number().min(34).max(43).nullable().default(null), cervicalMucus: z.enum(["not_observed", "dry", "sticky", "creamy", "watery", "egg_white"]).default("not_observed"), opkResult: z.enum(["not_taken", "negative", "positive", "unclear"]).default("not_taken"), pregnancyTest: z.enum(["not_taken", "negative", "positive", "unclear"]).default("not_taken"), notes: z.string().max(1000).nullable() });
export const medicationInput = z.object({
  name: z.string().trim().min(1).max(120),
  dosage: z.string().trim().min(1).max(160),
  notes: z.string().trim().max(1000).nullable(),
  reminderTimes: z.array(timeKey).min(1).max(6).transform(times => [...new Set(times)].sort()),
  isActive: z.boolean(),
});
export const medicationDoseInput = z.object({ doseDate: dateKey, scheduledTime: timeKey });
export const appLockInput = z.object({ pin: z.string().regex(/^\d{4,8}$/).nullable() });
export const appLockVerifyInput = z.object({ pin: z.string().regex(/^\d{4,8}$/) });
export const accountDeletionInput = z.object({ confirmation: z.literal("حذف حسابي") });
