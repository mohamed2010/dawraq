import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMock = vi.hoisted(() => ({
  createCycleRecordForUser: vi.fn(async () => 77),
  deleteCycleRecordForUser: vi.fn(async () => undefined),
  getProfileForUser: vi.fn(async () => null),
  listCycleRecordsForUser: vi.fn(async () => [{
    id: 7,
    userId: 41,
    startDate: "2026-04-01",
    endDate: null,
    symptomsJson: '["صداع"]',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }]),
  saveProfileForUser: vi.fn(),
  updateCycleRecordForUser: vi.fn(async () => undefined),
}));

vi.mock("./db", () => dbMock);

import { appRouter } from "./routers";

function userContext(userId: number): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `user-${userId}`,
      name: "Private user",
      email: "private@example.com",
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

describe("protected cycle router isolation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists cycles using only the authenticated account id", async () => {
    const caller = appRouter.createCaller(userContext(41));
    const result = await caller.cycles.list();

    expect(dbMock.listCycleRecordsForUser).toHaveBeenCalledWith(41);
    expect(result[0]).toMatchObject({ id: 7, symptoms: ["صداع"] });
  });

  it("updates a record through the authenticated account scope", async () => {
    const caller = appRouter.createCaller(userContext(41));
    await caller.cycles.update({
      id: 7,
      startDate: "2026-04-01",
      endDate: "2026-04-05",
      symptoms: ["تقلصات"],
      notes: "private note",
    });

    expect(dbMock.updateCycleRecordForUser).toHaveBeenCalledWith(41, 7, expect.objectContaining({
      startDate: "2026-04-01",
      endDate: "2026-04-05",
    }));
  });

  it("rejects a second ongoing record and preserves the user-facing conflict rule", async () => {
    dbMock.createCycleRecordForUser.mockRejectedValueOnce(new Error("ONGOING_PERIOD_EXISTS"));
    const caller = appRouter.createCaller(userContext(41));

    await expect(caller.cycles.create({
      startDate: "2026-04-28",
      endDate: null,
      symptoms: [],
      notes: null,
    })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(dbMock.createCycleRecordForUser).toHaveBeenCalledWith(41, expect.objectContaining({ endDate: null }));
  });

  it("deletes by record id only within the authenticated account scope", async () => {
    const caller = appRouter.createCaller(userContext(41));
    await caller.cycles.delete({ id: 7 });
    expect(dbMock.deleteCycleRecordForUser).toHaveBeenCalledWith(41, 7);
  });
});
