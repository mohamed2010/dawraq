import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUserById: vi.fn(),
  getProfileForUser: vi.fn(),
  listCycleRecordsForUser: vi.fn(),
  listDailyEntriesForUser: vi.fn(),
}));

vi.mock("./db", () => mocks);

import { createLocalSession } from "../lib/auth";
import { GET as getProfile } from "../app/api/profile/route";
import { GET as getCycles } from "../app/api/cycles/route";
import { GET as getDailyEntries } from "../app/api/daily-entries/route";

const userOne = {
  id: 101,
  openId: "local_101",
  name: "الحساب الأول",
  email: "first@example.com",
  passwordHash: "local-password-hash",
  loginMethod: "local",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const userTwo = { ...userOne, id: 202, openId: "local_202", email: "second@example.com", name: "الحساب الثاني" };

function requestWith(token: string) {
  return new Request("https://zuhaira.test/api/private", { headers: { cookie: `app_session_id=${token}` } });
}

describe("local sessions preserve account isolation", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "a-secure-test-secret-that-is-at-least-32-characters";
    Object.values(mocks).forEach(mock => mock.mockReset());
    mocks.getUserById.mockImplementation(async (id: number) => id === userOne.id ? userOne : id === userTwo.id ? userTwo : null);
    mocks.getProfileForUser.mockResolvedValue(null);
    mocks.listCycleRecordsForUser.mockResolvedValue([]);
    mocks.listDailyEntriesForUser.mockResolvedValue([]);
  });

  it("uses the signed session user ID for profile, cycles, and daily entries", async () => {
    const firstToken = await createLocalSession(userOne);
    const secondToken = await createLocalSession(userTwo);

    await getProfile(requestWith(firstToken));
    await getCycles(requestWith(firstToken));
    await getDailyEntries(requestWith(firstToken));
    expect(mocks.getProfileForUser).toHaveBeenLastCalledWith(userOne.id);
    expect(mocks.listCycleRecordsForUser).toHaveBeenLastCalledWith(userOne.id);
    expect(mocks.listDailyEntriesForUser).toHaveBeenLastCalledWith(userOne.id);

    await getProfile(requestWith(secondToken));
    await getCycles(requestWith(secondToken));
    await getDailyEntries(requestWith(secondToken));
    expect(mocks.getProfileForUser).toHaveBeenLastCalledWith(userTwo.id);
    expect(mocks.listCycleRecordsForUser).toHaveBeenLastCalledWith(userTwo.id);
    expect(mocks.listDailyEntriesForUser).toHaveBeenLastCalledWith(userTwo.id);
  });
});
