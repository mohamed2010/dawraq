import { describe, expect, it } from "vitest";
import { calculateCycleStatistics } from "../shared/cycleMath";

describe("calculateCycleStatistics", () => {
  it("uses completed records to calculate duration and consecutive starts for cycle prediction", () => {
    const stats = calculateCycleStatistics([
      { id: 1, startDate: "2026-01-01", endDate: "2026-01-05" },
      { id: 2, startDate: "2026-01-30", endDate: "2026-02-03" },
      { id: 3, startDate: "2026-02-28", endDate: null },
    ], 28, "2026-03-01");

    expect(stats.averageCycleLength).toBe(29);
    expect(stats.averagePeriodDuration).toBe(5);
    expect(stats.nextPeriodStart).toBe("2026-03-29");
    expect(stats.ovulationDate).toBe("2026-03-15");
    expect(stats.fertileStart).toBe("2026-03-10");
    expect(stats.fertileEnd).toBe("2026-03-16");
    expect(stats.currentPeriodDay).toBe(2);
  });

  it("uses the profile preference when no reliable history exists", () => {
    const stats = calculateCycleStatistics([
      { id: 1, startDate: "2026-05-04", endDate: null },
    ], 30, "2026-05-05");
    expect(stats.averageCycleLength).toBe(30);
    expect(stats.averagePeriodDuration).toBeNull();
    expect(stats.nextPeriodStart).toBe("2026-06-03");
  });
});

