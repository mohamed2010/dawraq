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

  it("applies explicit theme variables and an opaque backdrop to portal dialogs", () => {
    expect(homeSource).toContain("const dialogThemeValues");
    expect(homeSource).toContain("style={dialogThemeStyle(theme)}");
    expect(styleSource).toContain("background-color:var(--surface) !important");
    expect(styleSource).toContain('[data-slot="dialog-overlay"] { background:rgba(28,20,31,.62) !important');
  });

  it("keeps the bottom navigation fixed, opaque, and clear of the page content", () => {
    expect(styleSource).toContain(".bottom-nav { position:fixed");
    expect(styleSource).toContain("background:var(--surface)");
    expect(styleSource).toContain(".app-shell { width: min(100%, 980px); margin: 0 auto; padding:14px 14px calc(124px + env(safe-area-inset-bottom)); }");
    expect(styleSource).not.toContain("position:sticky; top:12px");
  });
});
