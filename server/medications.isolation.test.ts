import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUserById: vi.fn(),
  updateMedicationForUser: vi.fn(),
  deleteMedicationForUser: vi.fn(),
  recordMedicationDoseForUser: vi.fn(),
}));

vi.mock("./db", () => mocks);

import { createLocalSession } from "../lib/auth";
import { PATCH as updateMedication, DELETE as deleteMedication } from "../app/api/medications/[id]/route";
import { POST as takeMedicationDose } from "../app/api/medications/[id]/taken/route";

const accountA = {
  id: 111,
  openId: "local_111",
  name: "الحساب الأول",
  email: "first@example.com",
  passwordHash: "local-password-hash",
  loginMethod: "local",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function requestWithSession(token: string, method: "PATCH" | "DELETE" | "POST", body?: unknown) {
  return new Request("https://zuhaira.test/api/medications/222", {
    method,
    headers: { cookie: `app_session_id=${token}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("medication ownership isolation", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "a-secure-test-secret-that-is-at-least-32-characters";
    Object.values(mocks).forEach(mock => mock.mockReset());
    mocks.getUserById.mockResolvedValue(accountA);
    mocks.updateMedicationForUser.mockRejectedValue(new Error("MEDICATION_NOT_FOUND"));
    mocks.deleteMedicationForUser.mockRejectedValue(new Error("MEDICATION_NOT_FOUND"));
    mocks.recordMedicationDoseForUser.mockRejectedValue(new Error("MEDICATION_NOT_FOUND"));
  });

  it("cannot alter, delete, or confirm a dose for medication owned by another account", async () => {
    const token = await createLocalSession(accountA);
    const context = { params: Promise.resolve({ id: "222" }) };
    const updateResponse = await updateMedication(requestWithSession(token, "PATCH", { name: "دواء", dosage: "قرص", notes: null, reminderTimes: ["09:00"], isActive: false }), context);
    const deleteResponse = await deleteMedication(requestWithSession(token, "DELETE"), context);
    const doseResponse = await takeMedicationDose(requestWithSession(token, "POST", { doseDate: "2026-08-15", scheduledTime: "09:00" }), context);

    expect(updateResponse.status).toBe(404);
    expect(deleteResponse.status).toBe(404);
    expect(doseResponse.status).toBe(404);
    expect(mocks.updateMedicationForUser).toHaveBeenCalledWith(accountA.id, 222, expect.objectContaining({ isActive: false, reminderTimes: ["09:00"] }));
    expect(mocks.deleteMedicationForUser).toHaveBeenCalledWith(accountA.id, 222);
    expect(mocks.recordMedicationDoseForUser).toHaveBeenCalledWith(accountA.id, 222, "2026-08-15", "09:00");
  });
});
