import { boolean, index, integer, pgEnum, pgTable, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["user", "admin"]);
export const relationshipStatus = pgEnum("relationship_status", ["single", "married"]);
export const pregnancyStatus = pgEnum("pregnancy_status", ["not_pregnant", "pregnant", "not_sure"]);
export const appTheme = pgEnum("app_theme", ["light", "dark", "pink", "purple"]);
export const mood = pgEnum("mood", ["very_low", "low", "neutral", "good", "great", "irritable", "anxious"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  // A legacy-compatible internal identifier. Local accounts use a random
  // `local_` identifier and never call Manus OAuth.
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  // Legacy OAuth-era rows can have no email. New local registrations always
  // provide one, but the database keeps old private records intact.
  email: varchar("email", { length: 320 }),
  passwordHash: text("password_hash"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRole("role").notNull().default("user"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull(),
}, table => [uniqueIndex("users_email_unique").on(table.email)]);

export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  displayName: varchar("display_name", { length: 80 }).notNull(),
  averageCycleLength: integer("average_cycle_length").notNull().default(28),
  typicalBleedingDays: integer("typical_bleeding_days").notNull().default(5),
  relationshipStatus: relationshipStatus("relationship_status").notNull().default("single"),
  pregnancyStatus: pregnancyStatus("pregnancy_status").notNull().default("not_pregnant"),
  theme: appTheme("theme").notNull().default("pink"),
  language: varchar("language", { length: 5 }).notNull().default("ar"),
  stealthMode: boolean("stealth_mode").notNull().default(false),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  appLockHash: text("app_lock_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const cycleRecords = pgTable("cycle_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startDate: varchar("start_date", { length: 10 }).notNull(),
  endDate: varchar("end_date", { length: 10 }),
  symptomsJson: text("symptoms_json").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [index("cycle_records_user_start_idx").on(table.userId, table.startDate)]);

export const dailyEntries = pgTable("daily_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  entryDate: varchar("entry_date", { length: 10 }).notNull(),
  mood: mood("mood").notNull(),
  painLevel: integer("pain_level").notNull().default(0),
  symptomsJson: text("symptoms_json").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [uniqueIndex("daily_entries_user_date_unique").on(table.userId, table.entryDate)]);

export const medications = pgTable("medications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  dosage: varchar("dosage", { length: 160 }).notNull(),
  notes: text("notes"),
  reminderTimesJson: text("reminder_times_json").notNull().default("[]"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [index("medications_user_active_idx").on(table.userId, table.isActive)]);

export const medicationDoseLogs = pgTable("medication_dose_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  medicationId: integer("medication_id").notNull().references(() => medications.id, { onDelete: "cascade" }),
  doseDate: varchar("dose_date", { length: 10 }).notNull(),
  scheduledTime: varchar("scheduled_time", { length: 5 }).notNull(),
  takenAt: timestamp("taken_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [
  uniqueIndex("medication_dose_logs_unique").on(table.userId, table.medicationId, table.doseDate, table.scheduledTime),
  index("medication_dose_logs_user_date_idx").on(table.userId, table.doseDate),
]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type CycleRecord = typeof cycleRecords.$inferSelect;
export type DailyEntry = typeof dailyEntries.$inferSelect;
export type Medication = typeof medications.$inferSelect;
export type MedicationDoseLog = typeof medicationDoseLogs.$inferSelect;
