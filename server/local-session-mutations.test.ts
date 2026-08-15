import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUserById: vi.fn(),
  updateCycleRecordForUser: vi.fn(),
  deleteCycleRecordForUser: vi.fn(),
  deleteDailyEntryForUser: vi.fn(),
}));

vi.mock("./db", () => mocks);

import { createLocalSession } from "../lib/auth";
import { PATCH as updateCycle, DELETE as deleteCycle } from "../app/api/cycles/[id]/route";
import { DELETE as deleteDailyEntry } from "../app/api/daily-entries/[id]/route";

const accountA = {
  id: 101,
  openId: "local_101",
  name: "الحساب الأول",
  email: "first@example.com",
  passwordHash: "local-password-hash",
  loginMethod: "local",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function mutationRequest(method: "PATCH" | "DELETE", body?: unknown) {
  return new Request("https://zuhaira.test/api/private/202", {
    method,
    headers: { cookie: "", "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("local session mutation isolation", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "a-secure-test-secret-that-is-at-least-32-characters";
    Object.values(mocks).forEach(mock => mock.mockReset());
    mocks.getUserById.mockResolvedValue(accountA);
    mocks.updateCycleRecordForUser.mockRejectedValue(new Error("RECORD_NOT_FOUND"));
    mocks.deleteCycleRecordForUser.mockRejectedValue(new Error("RECORD_NOT_FOUND"));
    mocks.deleteDailyEntryForUser.mockRejectedValue(new Error("DAILY_ENTRY_NOT_FOUND"));
  });

  it("rejects attempts to update or delete records owned by another account", async () => {
    const token = await createLocalSession(accountA);
    const withSession = (request: Request) => {
      const headers = new Headers(request.headers);
      headers.set("cookie", `app_session_id=${token}`);
      return new Request(request, { headers });
    };
    const context = { params: Promise.resolve({ id: "202" }) };

    const updateResponse = await updateCycle(withSession(mutationRequest("PATCH", { startDate: "2026-08-01", endDate: null, symptoms: [], notes: null })), context);
    const deleteCycleResponse = await deleteCycle(withSession(mutationRequest("DELETE")), context);
    const deleteDailyResponse = await deleteDailyEntry(withSession(mutationRequest("DELETE")), context);

    expect(updateResponse.status).toBe(404);
    expect(deleteCycleResponse.status).toBe(404);
    expect(deleteDailyResponse.status).toBe(404);
    expect(mocks.updateCycleRecordForUser).toHaveBeenCalledWith(accountA.id, 202, expect.any(Object));
    expect(mocks.deleteCycleRecordForUser).toHaveBeenCalledWith(accountA.id, 202);
    expect(mocks.deleteDailyEntryForUser).toHaveBeenCalledWith(accountA.id, 202);
  });
});
