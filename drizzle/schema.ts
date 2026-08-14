import { index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const userProfiles = mysqlTable("user_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  displayName: varchar("display_name", { length: 80 }).notNull(),
  averageCycleLength: int("average_cycle_length").notNull().default(28),
  theme: mysqlEnum("theme", ["light", "dark", "pink", "purple"]).notNull().default("pink"),
  stealthMode: int("stealth_mode").notNull().default(0),
  onboardingCompleted: int("onboarding_completed").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const cycleRecords = mysqlTable("cycle_records", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  startDate: varchar("start_date", { length: 10 }).notNull(),
  endDate: varchar("end_date", { length: 10 }),
  symptomsJson: text("symptoms_json").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("cycle_records_user_start_idx").on(table.userId, table.startDate),
]);

export const dailyEntries = mysqlTable("daily_entries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  entryDate: varchar("entry_date", { length: 10 }).notNull(),
  mood: mysqlEnum("mood", ["very_low", "low", "neutral", "good", "great"]).notNull(),
  symptomsJson: text("symptoms_json").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("daily_entries_user_date_unique").on(table.userId, table.entryDate),
]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type CycleRecord = typeof cycleRecords.$inferSelect;
export type DailyEntry = typeof dailyEntries.$inferSelect;
