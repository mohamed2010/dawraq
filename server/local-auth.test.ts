import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUserById } = vi.hoisted(() => ({ getUserById: vi.fn() }));

vi.mock("./db", () => ({ getUserById }));

import { AuthenticationError, createLocalSession, getAuthenticatedUser } from "../lib/auth";
import { hashPassword, verifyPassword } from "../lib/password";

const user = {
  id: 42,
  openId: "local_42",
  name: "مستخدمة اختبار",
  email: "test@example.com",
  passwordHash: "scrypt$16384$8$1$00$00",
  loginMethod: "local",
  role: "user" as const,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  lastSignedIn: new Date("2026-01-01T00:00:00.000Z"),
};

describe("local account security", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "a-secure-test-secret-that-is-at-least-32-characters";
    getUserById.mockReset();
  });

  it("hashes passwords with a unique salt and verifies only the correct password", async () => {
    const first = await hashPassword("correct horse battery staple");
    const second = await hashPassword("correct horse battery staple");

    expect(first).toMatch(/^scrypt\$16384\$8\$1\$/);
    expect(first).not.toBe(second);
    await expect(verifyPassword("correct horse battery staple", first)).resolves.toBe(true);
    await expect(verifyPassword("incorrect password", first)).resolves.toBe(false);
  });

  it("accepts a valid local session and never returns the password hash", async () => {
    getUserById.mockResolvedValue(user);
    const token = await createLocalSession(user);
    const request = new Request("https://example.test/api/profile", { headers: { cookie: `app_session_id=${token}` } });

    await expect(getAuthenticatedUser(request)).resolves.toMatchObject({ id: 42, email: "test@example.com", loginMethod: "local" });
    const authenticated = await getAuthenticatedUser(request);
    expect(authenticated).not.toHaveProperty("passwordHash");
  });

  it("rejects a session when the matching local account no longer exists", async () => {
    getUserById.mockResolvedValue(null);
    const token = await createLocalSession(user);
    const request = new Request("https://example.test/api/profile", { headers: { cookie: `app_session_id=${token}` } });

    await expect(getAuthenticatedUser(request)).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("rejects the publicly documented example session secret", async () => {
    process.env.JWT_SECRET = "super-secret-cryptakey-jwt-token-2026";

    await expect(createLocalSession(user)).rejects.toThrow("JWT_SECRET غير مضبوط بصورة آمنة.");
  });
});
