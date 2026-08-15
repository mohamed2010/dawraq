import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetDb } = vi.hoisted(() => ({ mockGetDb: vi.fn() }));
vi.mock("./db", () => ({ getDb: mockGetDb }));

import { GET } from "../app/api/health/route";

describe("production health route", () => {
  beforeEach(() => {
    mockGetDb.mockReset();
  });

  it("reports a connected database when a minimal query succeeds", async () => {
    mockGetDb.mockResolvedValue({ execute: vi.fn().mockResolvedValue(undefined) });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok", framework: "nextjs", database: "connected" });
  });

  it("reports a missing database configuration without exposing connection details", async () => {
    mockGetDb.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: "ok", framework: "nextjs", database: "not_configured" });
  });

  it("reports an unavailable database without returning the underlying error", async () => {
    mockGetDb.mockResolvedValue({ execute: vi.fn().mockRejectedValue(new Error("connection refused")) });

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: "ok", framework: "nextjs", database: "unavailable" });
  });
});
