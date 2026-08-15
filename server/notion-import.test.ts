import { describe, expect, it } from "vitest";
import { parseNotionExport } from "../client/src/components/NotionImportPanel";

describe("Notion historical import parser", () => {
  it("reads start, end, and notes from a Notion CSV export while marking matching cycles", () => {
    const rows = parseNotionExport("Start,End,Notes\n2025-01-02,2025-01-06,سجل قديم\n2025-02-03,,مستمرة", [{ id: 1, startDate: "2025-01-02", endDate: "2025-01-06", symptoms: [], flowVolume: "medium", notes: null }]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ startDate: "2025-01-02", endDate: "2025-01-06", duplicate: true, selected: false });
    expect(rows[1]).toMatchObject({ startDate: "2025-02-03", endDate: null, notes: "مستمرة", duplicate: false, selected: true });
  });
});
