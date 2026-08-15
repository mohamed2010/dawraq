import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUserById: vi.fn(), deleteUserAndDataForUser: vi.fn() }));
vi.mock("./db", () => mocks);

import { createLocalSession } from "../lib/auth";
import { DELETE as deleteAccount } from "../app/api/account/route";

const account = { id: 501, openId: "local_501", name: "حساب خاص", email: "private@example.com", passwordHash: "hash", loginMethod: "local", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };

describe("account deletion route", () => {
  beforeEach(() => { process.env.JWT_SECRET = "a-secure-test-secret-that-is-at-least-32-characters"; mocks.getUserById.mockReset(); mocks.deleteUserAndDataForUser.mockReset(); mocks.getUserById.mockResolvedValue(account); mocks.deleteUserAndDataForUser.mockResolvedValue(undefined); });

  it("requires explicit Arabic confirmation and deletes only the authenticated account", async () => {
    const token = await createLocalSession(account);
    const request = (confirmation: string) => new Request("https://zuhaira.test/api/account", { method: "DELETE", headers: { cookie: `app_session_id=${token}`, "content-type": "application/json" }, body: JSON.stringify({ confirmation }) });
    const rejected = await deleteAccount(request("حذف"));
    expect(rejected.status).toBe(400);
    expect(mocks.deleteUserAndDataForUser).not.toHaveBeenCalled();
    const approved = await deleteAccount(request("حذف حسابي"));
    expect(approved.status).toBe(200);
    expect(mocks.deleteUserAndDataForUser).toHaveBeenCalledWith(account.id);
  });
});
