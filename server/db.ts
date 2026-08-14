import { and, desc, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { cycleRecords, InsertUser, userProfiles, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let database: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!database && process.env.DATABASE_URL) {
    database = drizzle(process.env.DATABASE_URL);
  }
  return database;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  const db = await getDb();
  if (!db || !user.openId) return;
  const role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  await db.insert(users).values({
    openId: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    role,
    lastSignedIn: new Date(),
  }).onDuplicateKeyUpdate({
    set: {
      name: user.name ?? null,
      email: user.email ?? null,
      loginMethod: user.loginMethod ?? null,
      lastSignedIn: new Date(),
    },
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

export async function saveProfileForUser(userId: number, input: {
  displayName: string;
  averageCycleLength: number;
  theme: "light" | "dark" | "pink" | "purple";
  stealthMode: boolean;
  onboardingCompleted: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const values = {
    userId,
    displayName: input.displayName,
    averageCycleLength: input.averageCycleLength,
    theme: input.theme,
    stealthMode: input.stealthMode ? 1 : 0,
    onboardingCompleted: input.onboardingCompleted ? 1 : 0,
  };
  await db.insert(userProfiles).values(values).onDuplicateKeyUpdate({ set: values });
  return getProfileForUser(userId);
}

export async function listCycleRecordsForUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select().from(cycleRecords)
    .where(eq(cycleRecords.userId, userId))
    .orderBy(desc(cycleRecords.startDate), desc(cycleRecords.id));
}

async function ensureNoOtherOngoingRecord(userId: number, excludedId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const records = await db.select({ id: cycleRecords.id }).from(cycleRecords)
    .where(and(eq(cycleRecords.userId, userId), isNull(cycleRecords.endDate)));
  return !records.some(record => record.id !== excludedId);
}

export async function createCycleRecordForUser(userId: number, input: {
  startDate: string;
  endDate: string | null;
  symptoms: string[];
  notes: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (!input.endDate && !(await ensureNoOtherOngoingRecord(userId))) {
    throw new Error("ONGOING_PERIOD_EXISTS");
  }
  const result = await db.insert(cycleRecords).values({
    userId,
    startDate: input.startDate,
    endDate: input.endDate,
    symptomsJson: JSON.stringify(input.symptoms),
    notes: input.notes,
  });
  return result[0].insertId;
}

export async function updateCycleRecordForUser(userId: number, id: number, input: {
  startDate: string;
  endDate: string | null;
  symptoms: string[];
  notes: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (!input.endDate && !(await ensureNoOtherOngoingRecord(userId, id))) {
    throw new Error("ONGOING_PERIOD_EXISTS");
  }
  const result = await db.update(cycleRecords).set({
    startDate: input.startDate,
    endDate: input.endDate,
    symptomsJson: JSON.stringify(input.symptoms),
    notes: input.notes,
  }).where(and(eq(cycleRecords.id, id), eq(cycleRecords.userId, userId)));
  if (result[0].affectedRows === 0) throw new Error("RECORD_NOT_FOUND");
}

export async function deleteCycleRecordForUser(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.delete(cycleRecords)
    .where(and(eq(cycleRecords.id, id), eq(cycleRecords.userId, userId)));
  if (result[0].affectedRows === 0) throw new Error("RECORD_NOT_FOUND");
}
