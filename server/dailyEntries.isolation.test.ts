import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMock = vi.hoisted(() => ({
  createCycleRecordForUser: vi.fn(async () => 1),
  deleteCycleRecordForUser: vi.fn(async () => undefined),
  deleteDailyEntryForUser: vi.fn(async () => undefined),
  getProfileForUser: vi.fn(async () => null),
  listCycleRecordsForUser: vi.fn(async () => []),
  listDailyEntriesForUser: vi.fn(async () => [{
    id: 11,
    userId: 77,
    entryDate: "2026-08-14",
    mood: "good" as const,
    symptomsJson: '["صداع","إرهاق"]',
    notes: "نوم أفضل",
    createdAt: new Date(),
    updatedAt: new Date(),
  }]),
  saveProfileForUser: vi.fn(),
  saveDailyEntryForUser: vi.fn(async () => undefined),
  updateCycleRecordForUser: vi.fn(async () => undefined),
}));

vi.mock("./db", () => dbMock);

import { appRouter } from "./routers";

function userContext(userId: number): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `daily-user-${userId}`,
      name: "Daily user",
      email: "daily@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("protected daily-entry router isolation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists and parses entries only for the authenticated user", async () => {
    const result = await appRouter.createCaller(userContext(77)).dailyEntries.list();
    expect(dbMock.listDailyEntriesForUser).toHaveBeenCalledWith(77);
    expect(result[0]).toMatchObject({ id: 11, mood: "good", symptoms: ["صداع", "إرهاق"] });
  });

  it("saves a day through the authenticated user scope", async () => {
    await appRouter.createCaller(userContext(77)).dailyEntries.save({
      entryDate: "2026-08-14",
      mood: "neutral",
      symptoms: ["تقلصات"],
      notes: null,
    });
    expect(dbMock.saveDailyEntryForUser).toHaveBeenCalledWith(77, expect.objectContaining({ mood: "neutral" }));
  });

  it("deletes only within the authenticated user scope", async () => {
    await appRouter.createCaller(userContext(77)).dailyEntries.delete({ id: 11 });
    expect(dbMock.deleteDailyEntryForUser).toHaveBeenCalledWith(77, 11);
  });
});
