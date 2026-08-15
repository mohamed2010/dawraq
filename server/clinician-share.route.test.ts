import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUserById: vi.fn(), createClinicianShareForUser: vi.fn(), listClinicianSharesForUser: vi.fn(), revokeClinicianShareForUser: vi.fn() }));
vi.mock("./db", () => mocks);

import { createLocalSession } from "../lib/auth";
import { GET, POST } from "../app/api/shares/route";
import { DELETE } from "../app/api/shares/[id]/route";

const account = { id: 707, openId: "local_707", name: "حساب تقرير", email: "share@example.com", passwordHash: "hash", loginMethod: "local", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };

describe("clinician share routes", () => {
  beforeEach(() => { process.env.JWT_SECRET = "a-secure-test-secret-that-is-at-least-32-characters"; mocks.getUserById.mockReset(); mocks.createClinicianShareForUser.mockReset(); mocks.listClinicianSharesForUser.mockReset(); mocks.revokeClinicianShareForUser.mockReset(); mocks.getUserById.mockResolvedValue(account); mocks.createClinicianShareForUser.mockResolvedValue({ id: 11, token: "private-capability-token", expiresAt: new Date("2030-01-01T00:00:00Z") }); mocks.listClinicianSharesForUser.mockResolvedValue([]); });

  it("creates only a short-lived report link for the authenticated account", async () => {
    const token = await createLocalSession(account);
    const response = await POST(new Request("https://dawraw.vercel.app/api/shares", { method: "POST", headers: { cookie: `app_session_id=${token}`, "content-type": "application/json" }, body: JSON.stringify({ expiresInHours: 24 }) }));
    expect(response.status).toBe(201);
    expect(mocks.createClinicianShareForUser).toHaveBeenCalledWith(account.id, 24);
    expect((await response.json()).url).toBe("https://dawraw.vercel.app/share/private-capability-token");
  });

  it("lists and revokes shares only for the authenticated account", async () => {
    const token = await createLocalSession(account);
    const listResponse = await GET(new Request("https://dawraw.vercel.app/api/shares", { headers: { cookie: `app_session_id=${token}` } }));
    expect(listResponse.status).toBe(200);
    expect(mocks.listClinicianSharesForUser).toHaveBeenCalledWith(account.id);
    const revokeResponse = await DELETE(new Request("https://dawraw.vercel.app/api/shares/11", { method: "DELETE", headers: { cookie: `app_session_id=${token}` } }), { params: Promise.resolve({ id: "11" }) });
    expect(revokeResponse.status).toBe(200);
    expect(mocks.revokeClinicianShareForUser).toHaveBeenCalledWith(account.id, 11);
  });
});
