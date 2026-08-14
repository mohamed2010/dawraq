import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createCycleRecordForUser,
  deleteDailyEntryForUser,
  deleteCycleRecordForUser,
  getProfileForUser,
  listDailyEntriesForUser,
  listCycleRecordsForUser,
  saveDailyEntryForUser,
  saveProfileForUser,
  updateCycleRecordForUser,
} from "./db";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const theme = z.enum(["light", "dark", "pink", "purple"]);
const mood = z.enum(["very_low", "low", "neutral", "good", "great"]);
const cycleInput = z.object({
  startDate: dateKey,
  endDate: dateKey.nullable(),
  symptoms: z.array(z.string().min(1).max(40)).max(8),
  notes: z.string().max(1000).nullable(),
}).superRefine((value, ctx) => {
  if (value.endDate && value.endDate < value.startDate) {
    ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date must be on or after start date." });
  }
});
const dailyEntryInput = z.object({
  entryDate: dateKey,
  mood,
  symptoms: z.array(z.string().min(1).max(40)).max(10),
  notes: z.string().max(1000).nullable(),
});

function databaseError(error: unknown): never {
  const message = error instanceof Error ? error.message : "UNKNOWN";
  if (message === "ONGOING_PERIOD_EXISTS") {
    throw new TRPCError({ code: "CONFLICT", message: "يوجد حيض مستمر بالفعل. أضيفي تاريخ النهاية أولاً أو عدّلي السجل الحالي." });
  }
  if (message === "RECORD_NOT_FOUND") {
    throw new TRPCError({ code: "NOT_FOUND", message: "لم يتم العثور على هذا السجل." });
  }
  if (message === "DAILY_ENTRY_NOT_FOUND") {
    throw new TRPCError({ code: "NOT_FOUND", message: "لم يتم العثور على متابعة هذا اليوم." });
  }
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذر حفظ البيانات الآن." });
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  profile: router({
    get: protectedProcedure.query(({ ctx }) => getProfileForUser(ctx.user.id)),
    save: protectedProcedure.input(z.object({
      displayName: z.string().trim().min(1).max(80),
      averageCycleLength: z.number().int().min(20).max(45),
      theme,
      stealthMode: z.boolean(),
      onboardingCompleted: z.boolean(),
    })).mutation(async ({ ctx, input }) => {
      try {
        return await saveProfileForUser(ctx.user.id, input);
      } catch (error) {
        return databaseError(error);
      }
    }),
  }),
  cycles: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const records = await listCycleRecordsForUser(ctx.user.id);
      return records.map(record => ({
        ...record,
        symptoms: (() => {
          try { return JSON.parse(record.symptomsJson) as string[]; } catch { return []; }
        })(),
      }));
    }),
    create: protectedProcedure.input(cycleInput).mutation(async ({ ctx, input }) => {
      try {
        return { id: await createCycleRecordForUser(ctx.user.id, input) };
      } catch (error) {
        return databaseError(error);
      }
    }),
    update: protectedProcedure.input(cycleInput.safeExtend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      try {
        await updateCycleRecordForUser(ctx.user.id, input.id, input);
        return { success: true };
      } catch (error) {
        return databaseError(error);
      }
    }),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      try {
        await deleteCycleRecordForUser(ctx.user.id, input.id);
        return { success: true };
      } catch (error) {
        return databaseError(error);
      }
    }),
  }),
  dailyEntries: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const entries = await listDailyEntriesForUser(ctx.user.id);
      return entries.map(entry => ({
        ...entry,
        symptoms: (() => {
          try { return JSON.parse(entry.symptomsJson) as string[]; } catch { return []; }
        })(),
      }));
    }),
    save: protectedProcedure.input(dailyEntryInput).mutation(async ({ ctx, input }) => {
      try {
        await saveDailyEntryForUser(ctx.user.id, input);
        return { success: true };
      } catch (error) {
        return databaseError(error);
      }
    }),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      try {
        await deleteDailyEntryForUser(ctx.user.id, input.id);
        return { success: true };
      } catch (error) {
        return databaseError(error);
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
