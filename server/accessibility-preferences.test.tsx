// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccessibilityPanel } from "../client/src/components/EnhancementTools";

describe("accessibility preferences", () => {
  afterEach(() => { cleanup(); localStorage.clear(); delete document.documentElement.dataset.textScale; delete document.documentElement.dataset.contrast; });

  it("previews the chosen text size and saves it only after the explicit save action", async () => {
    const user = userEvent.setup();
    const saveFontScale = vi.fn().mockResolvedValue(true);
    render(<AccessibilityPanel userId={72} accountFontScale="normal" onFontScale={saveFontScale} />);
    await user.click(screen.getByRole("button", { name: "كبير" }));
    expect(document.documentElement.dataset.textScale).toBe("large");
    expect(screen.getByText("تغيير غير محفوظ")).toBeTruthy();
    expect(saveFontScale).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "حفظ حجم الخط" }));
    expect(saveFontScale).toHaveBeenCalledWith("large");
    expect(screen.getByText("تم الحفظ في حسابكِ")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "تفعيل التباين المرتفع" }));
    expect(document.documentElement.dataset.textScale).toBe("large");
    expect(document.documentElement.dataset.contrast).toBe("high");
    expect(localStorage.getItem("zuhaira-accessibility:72")).toContain('"contrast":true');
  });
});
