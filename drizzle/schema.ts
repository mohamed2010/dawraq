import { boolean, index, integer, pgEnum, pgTable, real, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

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
  sessionVersion: integer("session_version").notNull().default(1),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull(),
}, table => [uniqueIndex("users_email_unique").on(table.email)]);

export const authRateLimits = pgTable("auth_rate_limits", {
  keyHash: varchar("key_hash", { length: 64 }).primaryKey(),
  attemptCount: integer("attempt_count").notNull().default(0),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull().defaultNow(),
  blockedUntil: timestamp("blocked_until", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [index("password_reset_tokens_user_id_idx").on(table.userId), index("password_reset_tokens_expires_at_idx").on(table.expiresAt)]);

export const healthIntegrationConsents = pgTable("health_integration_consents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  platform: varchar("platform", { length: 32 }).notNull(),
  scopesJson: text("scopes_json").notNull(),
  consentedAt: timestamp("consented_at", { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, table => [uniqueIndex("health_integration_consents_user_platform_unique").on(table.userId, table.platform)]);

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
  tryingToConceive: boolean("trying_to_conceive").notNull().default(false),
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
  flowVolume: varchar("flow_volume", { length: 12 }).notNull().default("medium"),
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
  customSymptomsJson: text("custom_symptoms_json").notNull().default("[]"),
  energyLevel: integer("energy_level").notNull().default(3),
  weightKg: real("weight_kg"),
  basalTemperature: real("basal_temperature"),
  cervicalMucus: varchar("cervical_mucus", { length: 16 }).notNull().default("not_observed"),
  opkResult: varchar("opk_result", { length: 16 }).notNull().default("not_taken"),
  pregnancyTest: varchar("pregnancy_test", { length: 16 }).notNull().default("not_taken"),
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

export const clinicianShareReports = pgTable("clinician_share_reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 64 }).notNull(),
  reportJson: text("report_json").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, table => [
  uniqueIndex("clinician_share_reports_token_unique").on(table.tokenHash),
  index("clinician_share_reports_user_created_idx").on(table.userId, table.createdAt),
]);

export const devicePasskeys = pgTable("device_passkeys", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  credentialId: varchar("credential_id", { length: 512 }).notNull(),
  publicKey: text("public_key").notNull(),
  counter: integer("counter").notNull().default(0),
  transportsJson: text("transports_json").notNull().default("[]"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
}, table => [
  uniqueIndex("device_passkeys_credential_unique").on(table.credentialId),
  index("device_passkeys_user_created_idx").on(table.userId, table.createdAt),
]);

export const webauthnChallenges = pgTable("webauthn_challenges", {
  userId: integer("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  challenge: varchar("challenge", { length: 512 }).notNull(),
  ceremony: varchar("ceremony", { length: 20 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type CycleRecord = typeof cycleRecords.$inferSelect;
export type DailyEntry = typeof dailyEntries.$inferSelect;
export type Medication = typeof medications.$inferSelect;
export type MedicationDoseLog = typeof medicationDoseLogs.$inferSelect;
export type ClinicianShareReport = typeof clinicianShareReports.$inferSelect;
export type DevicePasskey = typeof devicePasskeys.$inferSelect;
