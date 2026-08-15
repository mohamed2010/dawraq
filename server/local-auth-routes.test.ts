import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createLocalUser: vi.fn(),
  getUserByEmail: vi.fn(),
  recordLocalSignIn: vi.fn(),
  getUserById: vi.fn(),
}));

vi.mock("./db", () => mocks);

import { hashPassword } from "../lib/password";
import { POST as register } from "../app/api/auth/register/route";
import { POST as login } from "../app/api/auth/login/route";
import { POST as logout } from "../app/api/auth/logout/route";

const user = {
  id: 77,
  openId: "local_77",
  name: "حساب مستقل",
  email: "local@example.com",
  passwordHash: "placeholder",
  loginMethod: "local",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function jsonRequest(path: string, body: unknown) {
  return new Request(`https://zuhaira.test${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

describe("local authentication routes", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "a-secure-test-secret-that-is-at-least-32-characters";
    Object.values(mocks).forEach(mock => mock.mockReset());
  });

  it("registers a local account without returning or storing a plain password", async () => {
    mocks.createLocalUser.mockImplementation(async (input: { passwordHash: string }) => ({ ...user, passwordHash: input.passwordHash }));

    const response = await register(jsonRequest("/api/auth/register", { name: "حساب مستقل", email: "LOCAL@example.com", password: "safe-password-123" }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(mocks.createLocalUser).toHaveBeenCalledWith(expect.objectContaining({ email: "local@example.com", name: "حساب مستقل", passwordHash: expect.stringMatching(/^scrypt\$/) }));
    expect(mocks.createLocalUser.mock.calls[0]?.[0].passwordHash).not.toContain("safe-password-123");
    expect(body.user).not.toHaveProperty("passwordHash");
    expect(response.headers.get("set-cookie")).toContain("app_session_id=");
  });

  it("starts a session only after correct local credentials and clears it on logout", async () => {
    const passwordHash = await hashPassword("safe-password-123");
    mocks.getUserByEmail.mockResolvedValue({ ...user, passwordHash });

    const loginResponse = await login(jsonRequest("/api/auth/login", { email: "local@example.com", password: "safe-password-123" }));
    expect(loginResponse.status).toBe(200);
    expect(mocks.recordLocalSignIn).toHaveBeenCalledWith(user.id);
    expect(loginResponse.headers.get("set-cookie")).toContain("app_session_id=");

    const logoutResponse = await logout();
    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.headers.get("set-cookie")).toContain("app_session_id=");
  });
});
