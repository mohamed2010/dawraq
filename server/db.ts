import { and, desc, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { cycleRecords, dailyEntries, InsertUser, medicationDoseLogs, medications, userProfiles, users } from "../drizzle/schema";

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

export async function upsertUser(user: Omit<InsertUser, "email"> & { email?: string | null }): Promise<void> {
  const db = await getDb();
  if (!db || !user.openId || !user.email) return;
  const email = user.email.trim().toLowerCase();
  const now = new Date();
  await db.insert(users).values({ openId: user.openId, name: user.name ?? null, email, passwordHash: user.passwordHash ?? null, loginMethod: user.loginMethod ?? "local", role: user.role ?? "user", lastSignedIn: now, updatedAt: now }).onConflictDoUpdate({
    target: users.openId,
    set: { name: user.name ?? null, email, passwordHash: user.passwordHash ?? null, loginMethod: user.loginMethod ?? "local", lastSignedIn: now, updatedAt: now },
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return (await db.select().from(users).where(eq(users.id, id)).limit(1))[0];
}

export async function deleteUserAndDataForUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const deleted = await db.delete(users).where(eq(users.id, userId)).returning({ id: users.id });
  if (!deleted.length) throw new Error("USER_NOT_FOUND");
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const normalized = email.trim().toLowerCase();
  return (await db.select().from(users).where(eq(users.email, normalized)).limit(1))[0];
}

export async function createLocalUser(input: { name: string; email: string; passwordHash: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const email = input.email.trim().toLowerCase();
  if (await getUserByEmail(email)) throw new Error("ACCOUNT_EXISTS");
  const now = new Date();
  const [user] = await db.insert(users).values({
    openId: `local_${randomUUID().replace(/-/g, "")}`,
    name: input.name.trim(),
    email,
    passwordHash: input.passwordHash,
    loginMethod: "local",
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  }).returning();
  return user;
}

export async function recordLocalSignIn(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(users).set({ lastSignedIn: new Date(), updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function getProfileForUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return (await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1))[0] ?? null;
}

export async function saveProfileForUser(userId: number, input: { displayName: string; averageCycleLength: number; typicalBleedingDays: number; relationshipStatus: "single" | "married"; pregnancyStatus: "not_pregnant" | "pregnant" | "not_sure"; theme: "light" | "dark" | "pink" | "purple"; language: "ar" | "en"; tryingToConceive: boolean; stealthMode: boolean; onboardingCompleted: boolean }) {
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

export async function createCycleRecordForUser(userId: number, input: { startDate: string; endDate: string | null; symptoms: string[]; flowVolume: "light" | "medium" | "heavy"; notes: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (!input.endDate && !(await ensureNoOtherOngoingRecord(userId))) throw new Error("ONGOING_PERIOD_EXISTS");
  const [created] = await db.insert(cycleRecords).values({ userId, startDate: input.startDate, endDate: input.endDate, symptomsJson: JSON.stringify(input.symptoms), flowVolume: input.flowVolume, notes: input.notes }).returning({ id: cycleRecords.id });
  return created.id;
}

export async function updateCycleRecordForUser(userId: number, id: number, input: { startDate: string; endDate: string | null; symptoms: string[]; flowVolume: "light" | "medium" | "heavy"; notes: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (!input.endDate && !(await ensureNoOtherOngoingRecord(userId, id))) throw new Error("ONGOING_PERIOD_EXISTS");
  const updated = await db.update(cycleRecords).set({ startDate: input.startDate, endDate: input.endDate, symptomsJson: JSON.stringify(input.symptoms), flowVolume: input.flowVolume, notes: input.notes, updatedAt: new Date() }).where(and(eq(cycleRecords.id, id), eq(cycleRecords.userId, userId))).returning({ id: cycleRecords.id });
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

export async function saveDailyEntryForUser(userId: number, input: { entryDate: string; mood: "very_low" | "low" | "neutral" | "good" | "great" | "irritable" | "anxious"; painLevel: number; symptoms: string[]; customSymptoms: string[]; energyLevel: number; weightKg: number | null; basalTemperature: number | null; cervicalMucus: "not_observed" | "dry" | "sticky" | "creamy" | "watery" | "egg_white"; opkResult: "not_taken" | "negative" | "positive" | "unclear"; pregnancyTest: "not_taken" | "negative" | "positive" | "unclear"; notes: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const values = { userId, entryDate: input.entryDate, mood: input.mood, painLevel: input.painLevel, symptomsJson: JSON.stringify(input.symptoms), customSymptomsJson: JSON.stringify(input.customSymptoms), energyLevel: input.energyLevel, weightKg: input.weightKg, basalTemperature: input.basalTemperature, cervicalMucus: input.cervicalMucus, opkResult: input.opkResult, pregnancyTest: input.pregnancyTest, notes: input.notes, updatedAt: new Date() };
  await db.insert(dailyEntries).values(values).onConflictDoUpdate({ target: [dailyEntries.userId, dailyEntries.entryDate], set: { mood: values.mood, painLevel: values.painLevel, symptomsJson: values.symptomsJson, customSymptomsJson: values.customSymptomsJson, energyLevel: values.energyLevel, weightKg: values.weightKg, basalTemperature: values.basalTemperature, cervicalMucus: values.cervicalMucus, opkResult: values.opkResult, pregnancyTest: values.pregnancyTest, notes: values.notes, updatedAt: values.updatedAt } });
}

export async function deleteDailyEntryForUser(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const deleted = await db.delete(dailyEntries).where(and(eq(dailyEntries.id, id), eq(dailyEntries.userId, userId))).returning({ id: dailyEntries.id });
  if (!deleted.length) throw new Error("DAILY_ENTRY_NOT_FOUND");
}

export type MedicationInput = { name: string; dosage: string; notes: string | null; reminderTimes: string[]; isActive: boolean };

export async function listMedicationsForUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select().from(medications).where(eq(medications.userId, userId)).orderBy(desc(medications.isActive), desc(medications.updatedAt), desc(medications.id));
}

export async function createMedicationForUser(userId: number, input: MedicationInput) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [created] = await db.insert(medications).values({
    userId,
    name: input.name,
    dosage: input.dosage,
    notes: input.notes,
    reminderTimesJson: JSON.stringify(input.reminderTimes),
    isActive: input.isActive,
  }).returning({ id: medications.id });
  return created.id;
}

export async function updateMedicationForUser(userId: number, id: number, input: MedicationInput) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const updated = await db.update(medications).set({
    name: input.name,
    dosage: input.dosage,
    notes: input.notes,
    reminderTimesJson: JSON.stringify(input.reminderTimes),
    isActive: input.isActive,
    updatedAt: new Date(),
  }).where(and(eq(medications.id, id), eq(medications.userId, userId))).returning({ id: medications.id });
  if (!updated.length) throw new Error("MEDICATION_NOT_FOUND");
}

export async function deleteMedicationForUser(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const deleted = await db.delete(medications).where(and(eq(medications.id, id), eq(medications.userId, userId))).returning({ id: medications.id });
  if (!deleted.length) throw new Error("MEDICATION_NOT_FOUND");
}

export async function recordMedicationDoseForUser(userId: number, medicationId: number, doseDate: string, scheduledTime: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const ownedMedication = await db.select({ id: medications.id }).from(medications).where(and(eq(medications.id, medicationId), eq(medications.userId, userId))).limit(1);
  if (!ownedMedication.length) throw new Error("MEDICATION_NOT_FOUND");
  await db.insert(medicationDoseLogs).values({ userId, medicationId, doseDate, scheduledTime }).onConflictDoNothing({ target: [medicationDoseLogs.userId, medicationDoseLogs.medicationId, medicationDoseLogs.doseDate, medicationDoseLogs.scheduledTime] });
}

export async function getAppLockHashForUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return (await db.select({ appLockHash: userProfiles.appLockHash }).from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1))[0]?.appLockHash ?? null;
}

export async function saveAppLockHashForUser(userId: number, appLockHash: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const updated = await db.update(userProfiles).set({ appLockHash, updatedAt: new Date() }).where(eq(userProfiles.userId, userId)).returning({ id: userProfiles.id });
  if (!updated.length) throw new Error("RECORD_NOT_FOUND");
}

export async function getPersonalHealthSummaryForUser(userId: number) {
  const [profile, cycles, dailyEntriesForUser, medicationsForUser, doseLogs] = await Promise.all([
    getProfileForUser(userId),
    listCycleRecordsForUser(userId),
    listDailyEntriesForUser(userId),
    listMedicationsForUser(userId),
    (async () => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      return db.select().from(medicationDoseLogs).where(eq(medicationDoseLogs.userId, userId)).orderBy(desc(medicationDoseLogs.takenAt)).limit(60);
    })(),
  ]);
  return { profile, cycles, dailyEntries: dailyEntriesForUser, medications: medicationsForUser, medicationDoseLogs: doseLogs };
}
