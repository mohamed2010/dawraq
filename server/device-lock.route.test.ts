import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({ getUserById: vi.fn(), getDevicePasskeyStatusForUser: vi.fn(), listDevicePasskeysForUser: vi.fn(), saveWebAuthnChallengeForUser: vi.fn(), deleteDevicePasskeysForUser: vi.fn() }));
const webauthnMocks = vi.hoisted(() => ({ generateRegistrationOptions: vi.fn() }));
vi.mock("./db", () => dbMocks);
vi.mock("@simplewebauthn/server", () => webauthnMocks);

import { createLocalSession } from "../lib/auth";
import { GET as status } from "../app/api/device-lock/route";
import { POST as registrationOptions } from "../app/api/device-lock/registration/options/route";

const account = { id: 606, openId: "local_606", name: "قفل الجهاز", email: "device@example.com", passwordHash: "hash", loginMethod: "local", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };

describe("device lock routes", () => {
  beforeEach(() => { process.env.JWT_SECRET = "a-secure-test-secret-that-is-at-least-32-characters"; Object.values(dbMocks).forEach(mock => mock.mockReset()); webauthnMocks.generateRegistrationOptions.mockReset(); dbMocks.getUserById.mockResolvedValue(account); dbMocks.getDevicePasskeyStatusForUser.mockResolvedValue({ enabled: false, credentialCount: 0 }); dbMocks.listDevicePasskeysForUser.mockResolvedValue([]); webauthnMocks.generateRegistrationOptions.mockResolvedValue({ challenge: "challenge-123", rp: { id: "dawraw.vercel.app" } }); });

  it("returns device-lock status only for the authenticated account", async () => {
    const token = await createLocalSession(account);
    const response = await status(new Request("https://dawraw.vercel.app/api/device-lock", { headers: { cookie: `app_session_id=${token}` } }));
    expect(response.status).toBe(200);
    expect(dbMocks.getDevicePasskeyStatusForUser).toHaveBeenCalledWith(account.id);
  });

  it("creates a short-lived registration challenge scoped to the authenticated account", async () => {
    const token = await createLocalSession(account);
    const response = await registrationOptions(new Request("https://dawraw.vercel.app/api/device-lock/registration/options", { method: "POST", headers: { cookie: `app_session_id=${token}` } }));
    expect(response.status).toBe(200);
    expect(dbMocks.saveWebAuthnChallengeForUser).toHaveBeenCalledWith(account.id, "registration", "challenge-123");
  });
});
