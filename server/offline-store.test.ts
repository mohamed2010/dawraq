import "fake-indexeddb/auto";
import { webcrypto } from "node:crypto";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.stubGlobal("crypto", webcrypto);

import { enqueueOfflineOperation, listOfflineOperations, loadActiveOfflineAccount, loadOfflineSnapshot, offlineOperationCount, saveActiveOfflineAccount, saveOfflineSnapshot } from "../client/src/lib/offline-store";

beforeAll(() => { vi.stubGlobal("btoa", (value: string) => Buffer.from(value, "binary").toString("base64")); vi.stubGlobal("atob", (value: string) => Buffer.from(value, "base64").toString("binary")); vi.stubGlobal("window", { indexedDB: globalThis.indexedDB, crypto: webcrypto }); });

describe("offline encrypted store", () => {
  it("keeps snapshots and pending changes scoped to their account", async () => {
    await saveOfflineSnapshot(801, { profile: null, cycles: [], dailyEntries: [], medications: [], savedAt: "2026-08-15T00:00:00.000Z" });
    await saveActiveOfflineAccount({ id: 801, name: "حساب محلي", email: "offline@example.com", role: "user" });
    await enqueueOfflineOperation({ id: "account-801-change", accountId: 801, resource: "cycle", action: "create", payload: { startDate: "2026-08-01", endDate: null, symptoms: [], flowVolume: "medium", notes: null }, createdAt: "2026-08-15T00:00:00.000Z" });
    await enqueueOfflineOperation({ id: "account-802-change", accountId: 802, resource: "daily-entry", action: "save", payload: { entryDate: "2026-08-02", mood: "neutral", painLevel: 0, symptoms: [], customSymptoms: [], energyLevel: 3, weightKg: null, basalTemperature: null, cervicalMucus: "not_observed", opkResult: "not_taken", pregnancyTest: "not_taken", notes: null }, createdAt: "2026-08-15T00:00:00.000Z" });

    expect((await loadOfflineSnapshot(801))?.savedAt).toBe("2026-08-15T00:00:00.000Z");
    expect(await loadActiveOfflineAccount()).toMatchObject({ id: 801, email: "offline@example.com" });
    expect(await loadOfflineSnapshot(802)).toBeNull();
    expect(await offlineOperationCount(801)).toBe(1);
    expect((await listOfflineOperations(801)).map(item => item.id)).toEqual(["account-801-change"]);
    expect((await listOfflineOperations(802)).map(item => item.id)).toEqual(["account-802-change"]);
  });
});
