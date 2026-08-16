import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  loginAttemptKeyForRequest: vi.fn(),
  assertLoginAttemptAllowed: vi.fn(),
  getUserByEmail: vi.fn(),
  createPasswordResetTokenForUser: vi.fn(),
  clearFailedLoginAttempts: vi.fn(),
  invalidatePasswordResetToken: vi.fn(),
  consumePasswordResetToken: vi.fn(),
  getUserById: vi.fn(),
}));
const emailMocks = vi.hoisted(() => ({ isTransactionalEmailConfigured: vi.fn(), passwordResetUrl: vi.fn(), sendPasswordResetEmail: vi.fn() }));

vi.mock("./db", () => dbMocks);
vi.mock("../lib/email", () => emailMocks);

import { POST as requestReset } from "../app/api/auth/password-reset/request/route";
import { POST as confirmReset } from "../app/api/auth/password-reset/confirm/route";

const user = { id: 81, openId: "local_81", name: "حساب الاسترداد", email: "reset@example.com", passwordHash: "scrypt$test", loginMethod: "local", role: "user" as const, sessionVersion: 2, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const request = (path: string, body: unknown) => new Request(`https://zuhaira.test${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe("password reset routes", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "a-secure-test-secret-that-is-at-least-32-characters";
    Object.values(dbMocks).forEach(mock => mock.mockReset());
    Object.values(emailMocks).forEach(mock => mock.mockReset());
    dbMocks.loginAttemptKeyForRequest.mockReturnValue("request-attempt-key");
    dbMocks.assertLoginAttemptAllowed.mockResolvedValue(undefined);
    dbMocks.clearFailedLoginAttempts.mockResolvedValue(undefined);
    emailMocks.isTransactionalEmailConfigured.mockReturnValue(true);
    emailMocks.passwordResetUrl.mockReturnValue("https://zuhaira.test/reset-password?token=opaque");
    emailMocks.sendPasswordResetEmail.mockResolvedValue(true);
  });

  it("returns the same generic success response for an unknown email without creating a token", async () => {
    dbMocks.getUserByEmail.mockResolvedValue(undefined);

    const response = await requestReset(request("/api/auth/password-reset/request", { email: "missing@example.com" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, message: "إذا كان البريد مسجلاً، ستصل رسالة إعادة التعيين قريباً." });
    expect(dbMocks.createPasswordResetTokenForUser).not.toHaveBeenCalled();
    expect(emailMocks.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("stores only a hash before sending a reset link for a known account", async () => {
    dbMocks.getUserByEmail.mockResolvedValue(user);

    const response = await requestReset(request("/api/auth/password-reset/request", { email: user.email }));

    expect(response.status).toBe(200);
    expect(dbMocks.createPasswordResetTokenForUser).toHaveBeenCalledWith(user.id, expect.stringMatching(/^[a-f0-9]{64}$/));
    expect(emailMocks.sendPasswordResetEmail).toHaveBeenCalledWith({ to: user.email, resetUrl: "https://zuhaira.test/reset-password?token=opaque" });
  });

  it("issues a fresh current-device session only after a valid unused token is consumed", async () => {
    dbMocks.consumePasswordResetToken.mockResolvedValue(user.id);
    dbMocks.getUserById.mockResolvedValue(user);

    const response = await confirmReset(request("/api/auth/password-reset/confirm", { token: "x".repeat(43), newPassword: "new-safe-password-123" }));

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("app_session_id=");
    expect(dbMocks.consumePasswordResetToken).toHaveBeenCalledWith(expect.stringMatching(/^[a-f0-9]{64}$/), expect.stringMatching(/^scrypt\$/));
  });
});
