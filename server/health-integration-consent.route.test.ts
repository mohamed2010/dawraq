import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUserById: vi.fn(), listHealthIntegrationConsentsForUser: vi.fn(), saveHealthIntegrationConsentForUser: vi.fn(), revokeHealthIntegrationConsentForUser: vi.fn(), deleteHealthIntegrationConsentForUser: vi.fn() }));
vi.mock("./db", () => mocks);

import { createLocalSession } from "../lib/auth";
import { DELETE, GET, PUT } from "../app/api/health-integrations/route";

const account = { id: 303, openId: "local_303", name: "موافقة صحية", email: "consent@example.com", passwordHash: "scrypt$placeholder", loginMethod: "local", role: "user" as const, sessionVersion: 1, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const consent = { id: 1, userId: account.id, platform: "health_connect", scopesJson: '["cycle_dates"]', consentedAt: new Date(), revokedAt: null, deletedAt: null };
const authenticatedRequest = async (method: "GET" | "PUT" | "DELETE", body?: unknown) => {
  const token = await createLocalSession(account);
  return new Request("https://zuhaira.test/api/health-integrations", { method, headers: { cookie: `app_session_id=${token}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
};

describe("health integration consents", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "a-secure-test-secret-that-is-at-least-32-characters";
    Object.values(mocks).forEach(mock => mock.mockReset());
    mocks.getUserById.mockResolvedValue(account);
    mocks.listHealthIntegrationConsentsForUser.mockResolvedValue([consent]);
    mocks.saveHealthIntegrationConsentForUser.mockResolvedValue(consent);
    mocks.revokeHealthIntegrationConsentForUser.mockResolvedValue(undefined);
    mocks.deleteHealthIntegrationConsentForUser.mockResolvedValue(undefined);
  });

  it("lists and saves only the authenticated account consent", async () => {
    const listResponse = await GET(await authenticatedRequest("GET"));
    expect(listResponse.status).toBe(200);
    expect(await listResponse.json()).toEqual([expect.objectContaining({ platform: "health_connect", scopes: ["cycle_dates"] })]);

    const saveResponse = await PUT(await authenticatedRequest("PUT", { platform: "health_connect", scopes: ["cycle_dates"] }));
    expect(saveResponse.status).toBe(200);
    expect(mocks.saveHealthIntegrationConsentForUser).toHaveBeenCalledWith(account.id, { platform: "health_connect", scopes: ["cycle_dates"] });
  });

  it("separates revocation from deletion", async () => {
    const revokeResponse = await DELETE(await authenticatedRequest("DELETE", { platform: "health_connect", action: "revoke" }));
    const deleteResponse = await DELETE(await authenticatedRequest("DELETE", { platform: "health_connect", action: "delete" }));
    expect(revokeResponse.status).toBe(200);
    expect(deleteResponse.status).toBe(200);
    expect(mocks.revokeHealthIntegrationConsentForUser).toHaveBeenCalledWith(account.id, "health_connect");
    expect(mocks.deleteHealthIntegrationConsentForUser).toHaveBeenCalledWith(account.id, "health_connect");
  });
});
