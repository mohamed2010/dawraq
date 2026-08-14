import { z } from "zod";

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const profileInput = z.object({ displayName: z.string().trim().min(1).max(80), averageCycleLength: z.number().int().min(20).max(45), typicalBleedingDays: z.number().int().min(1).max(14), relationshipStatus: z.enum(["single", "married"]), pregnancyStatus: z.enum(["not_pregnant", "pregnant", "not_sure"]), theme: z.enum(["light", "dark", "pink", "purple"]), stealthMode: z.boolean(), onboardingCompleted: z.boolean() });
export const cycleInput = z.object({ startDate: dateKey, endDate: dateKey.nullable(), symptoms: z.array(z.string().min(1).max(40)).max(8), notes: z.string().max(1000).nullable() }).superRefine((value, ctx) => { if (value.endDate && value.endDate < value.startDate) ctx.addIssue({ code: "custom", path: ["endDate"], message: "تاريخ النهاية يسبق البداية." }); });
export const dailyEntryInput = z.object({ entryDate: dateKey, mood: z.enum(["very_low", "low", "neutral", "good", "great", "irritable", "anxious"]), painLevel: z.number().int().min(0).max(4), symptoms: z.array(z.string().min(1).max(40)).max(10), notes: z.string().max(1000).nullable() });
