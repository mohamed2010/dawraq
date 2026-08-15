import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const homeSource = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
const styleSource = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");

describe("settings workspace and cycle dialog layout", () => {
  it("keeps every settings category available through the compact workspace", () => {
    ["ملفي", "التفضيلات", "المتابعة", "البيانات", "الأمان"].forEach(label => {
      expect(homeSource).toContain(`label: "${label}"`);
    });
    expect(homeSource).toContain('settingsSection === "security"');
    expect(homeSource).toContain("<AccountSecurityPanel");
    expect(homeSource).toContain("<PrivacyToolsPanel");
    expect(homeSource).toContain("<ReportsAndBackupPanel");
  });

  it("uses a dedicated scroll area and distinct action styles for cycle editing", () => {
    expect(homeSource).toContain('className="dialog-content cycle-dialog"');
    expect(homeSource).toContain('className="cycle-dialog-scroll"');
    expect(homeSource).toContain("edit-action");
    expect(styleSource).toContain(".cycle-dialog-scroll");
    expect(styleSource).toContain(".mini-action.edit-action");
  });
});
