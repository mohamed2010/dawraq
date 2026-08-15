import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUserById: vi.fn(), updateEmailForUser: vi.fn(), updatePasswordForUser: vi.fn() }));
vi.mock("./db", () => mocks);

import { PUT as changeEmail } from "../app/api/account/email/route";
import { PUT as changePassword } from "../app/api/account/password/route";
import { createLocalSession } from "../lib/auth";
import { hashPassword } from "../lib/password";

const account = { id: 733, openId: "local_733", name: "إعدادات الحساب", email: "account@example.com", passwordHash: "", loginMethod: "local", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const requestFor = async (url: string, body: unknown) => new Request(`https://dawraw.vercel.app${url}`, { method: "PUT", headers: { cookie: `app_session_id=${await createLocalSession(account)}`, "content-type": "application/json" }, body: JSON.stringify(body) });

describe("account security routes", () => {
  beforeEach(async () => { process.env.JWT_SECRET = "a-secure-test-secret-that-is-at-least-32-characters"; Object.values(mocks).forEach(mock => mock.mockReset()); account.passwordHash = await hashPassword("correct-password-123"); mocks.getUserById.mockResolvedValue(account); mocks.updateEmailForUser.mockResolvedValue({ ...account, email: "new@example.com" }); });

  it("changes the authenticated account email only after current-password confirmation", async () => {
    const response = await changeEmail(await requestFor("/api/account/email", { email: "NEW@example.com", currentPassword: "correct-password-123" }));
    expect(response.status).toBe(200);
    expect(mocks.updateEmailForUser).toHaveBeenCalledWith(account.id, "new@example.com");
  });

  it("rejects an email or password change when the current password is wrong", async () => {
    const emailResponse = await changeEmail(await requestFor("/api/account/email", { email: "new@example.com", currentPassword: "wrong-password" }));
    const passwordResponse = await changePassword(await requestFor("/api/account/password", { currentPassword: "wrong-password", newPassword: "new-password-123" }));
    expect(emailResponse.status).toBe(401);
    expect(passwordResponse.status).toBe(401);
    expect(mocks.updateEmailForUser).not.toHaveBeenCalled();
    expect(mocks.updatePasswordForUser).not.toHaveBeenCalled();
  });
});
