import { and, desc, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { cycleRecords, dailyEntries, InsertUser, userProfiles, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let pool: Pool | null = null;
let database: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!database && connectionString) {
    pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
    database = drizzle(pool);
  }
  return database;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  const db = await getDb();
  if (!db || !user.openId) return;
  const role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  const now = new Date();
  await db.insert(users).values({ openId: user.openId, name: user.name ?? null, email: user.email ?? null, loginMethod: user.loginMethod ?? null, role, lastSignedIn: now, updatedAt: now }).onConflictDoUpdate({
    target: users.openId,
    set: { name: user.name ?? null, email: user.email ?? null, loginMethod: user.loginMethod ?? null, lastSignedIn: now, updatedAt: now },
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
}

export async function getProfileForUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return (await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1))[0] ?? null;
}

export async function saveProfileForUser(userId: number, input: { displayName: string; averageCycleLength: number; typicalBleedingDays: number; relationshipStatus: "single" | "married"; pregnancyStatus: "not_pregnant" | "pregnant" | "not_sure"; theme: "light" | "dark" | "pink" | "purple"; stealthMode: boolean; onboardingCompleted: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const values = { userId, ...input, updatedAt: new Date() };
  await db.insert(userProfiles).values(values).onConflictDoUpdate({ target: userProfiles.userId, set: values });
  return getProfileForUser(userId);
}

export async function listCycleRecordsForUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select().from(cycleRecords).where(eq(cycleRecords.userId, userId)).orderBy(desc(cycleRecords.startDate), desc(cycleRecords.id));
}

async function ensureNoOtherOngoingRecord(userId: number, excludedId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const records = await db.select({ id: cycleRecords.id }).from(cycleRecords).where(and(eq(cycleRecords.userId, userId), isNull(cycleRecords.endDate)));
  return !records.some(record => record.id !== excludedId);
}

export async function createCycleRecordForUser(userId: number, input: { startDate: string; endDate: string | null; symptoms: string[]; notes: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (!input.endDate && !(await ensureNoOtherOngoingRecord(userId))) throw new Error("ONGOING_PERIOD_EXISTS");
  const [created] = await db.insert(cycleRecords).values({ userId, startDate: input.startDate, endDate: input.endDate, symptomsJson: JSON.stringify(input.symptoms), notes: input.notes }).returning({ id: cycleRecords.id });
  return created.id;
}

export async function updateCycleRecordForUser(userId: number, id: number, input: { startDate: string; endDate: string | null; symptoms: string[]; notes: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (!input.endDate && !(await ensureNoOtherOngoingRecord(userId, id))) throw new Error("ONGOING_PERIOD_EXISTS");
  const updated = await db.update(cycleRecords).set({ startDate: input.startDate, endDate: input.endDate, symptomsJson: JSON.stringify(input.symptoms), notes: input.notes, updatedAt: new Date() }).where(and(eq(cycleRecords.id, id), eq(cycleRecords.userId, userId))).returning({ id: cycleRecords.id });
  if (!updated.length) throw new Error("RECORD_NOT_FOUND");
}

export async function deleteCycleRecordForUser(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const deleted = await db.delete(cycleRecords).where(and(eq(cycleRecords.id, id), eq(cycleRecords.userId, userId))).returning({ id: cycleRecords.id });
  if (!deleted.length) throw new Error("RECORD_NOT_FOUND");
}

export async function listDailyEntriesForUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select().from(dailyEntries).where(eq(dailyEntries.userId, userId)).orderBy(desc(dailyEntries.entryDate), desc(dailyEntries.id));
}

export async function saveDailyEntryForUser(userId: number, input: { entryDate: string; mood: "very_low" | "low" | "neutral" | "good" | "great" | "irritable" | "anxious"; painLevel: number; symptoms: string[]; notes: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const values = { userId, entryDate: input.entryDate, mood: input.mood, painLevel: input.painLevel, symptomsJson: JSON.stringify(input.symptoms), notes: input.notes, updatedAt: new Date() };
  await db.insert(dailyEntries).values(values).onConflictDoUpdate({ target: [dailyEntries.userId, dailyEntries.entryDate], set: { mood: values.mood, painLevel: values.painLevel, symptomsJson: values.symptomsJson, notes: values.notes, updatedAt: values.updatedAt } });
}

export async function deleteDailyEntryForUser(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const deleted = await db.delete(dailyEntries).where(and(eq(dailyEntries.id, id), eq(dailyEntries.userId, userId))).returning({ id: dailyEntries.id });
  if (!deleted.length) throw new Error("DAILY_ENTRY_NOT_FOUND");
}
