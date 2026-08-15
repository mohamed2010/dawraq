import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUserById: vi.fn(), restoreBackupForUser: vi.fn() }));
vi.mock("./db", () => mocks);

import { createLocalSession } from "../lib/auth";
import { POST as restoreBackup } from "../app/api/backup/restore/route";

const account = { id: 909, openId: "local_909", name: "حساب النسخ", email: "backup@example.com", passwordHash: "hash", loginMethod: "local", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const backup = { profile: null, cycles: [], dailyEntries: [], medications: [] };

describe("backup restore route", () => {
  beforeEach(() => { process.env.JWT_SECRET = "a-secure-test-secret-that-is-at-least-32-characters"; mocks.getUserById.mockReset(); mocks.restoreBackupForUser.mockReset(); mocks.getUserById.mockResolvedValue(account); mocks.restoreBackupForUser.mockResolvedValue({ cycles: 0, dailyEntries: 0, medications: 0 }); });

  it("requires confirmation and restores only data for the authenticated account", async () => {
    const token = await createLocalSession(account);
    const request = (confirmation: string) => new Request("https://zuhaira.test/api/backup/restore", { method: "POST", headers: { cookie: `app_session_id=${token}`, "content-type": "application/json" }, body: JSON.stringify({ confirmation, backup }) });
    expect((await restoreBackup(request("استعادة"))).status).toBe(400);
    expect(mocks.restoreBackupForUser).not.toHaveBeenCalled();
    expect((await restoreBackup(request("استعادة النسخة"))).status).toBe(200);
    expect(mocks.restoreBackupForUser).toHaveBeenCalledWith(account.id, backup);
  });
});
