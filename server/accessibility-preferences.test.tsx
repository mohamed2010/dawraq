// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccessibilityPanel } from "../client/src/components/EnhancementTools";

describe("accessibility preferences", () => {
  afterEach(() => { cleanup(); localStorage.clear(); delete document.documentElement.dataset.textScale; delete document.documentElement.dataset.contrast; });

  it("applies the account font size and stores high contrast only on this device", async () => {
    const user = userEvent.setup();
    const savedSizes: string[] = [];
    render(<AccessibilityPanel userId={72} accountFontScale="normal" onFontScale={value => savedSizes.push(value)} />);
    await user.click(screen.getByRole("button", { name: "كبير" }));
    await user.click(screen.getByRole("button", { name: "تفعيل التباين المرتفع" }));
    expect(document.documentElement.dataset.textScale).toBe("large");
    expect(document.documentElement.dataset.contrast).toBe("high");
    expect(savedSizes).toEqual(["large"]);
    expect(localStorage.getItem("zuhaira-accessibility:72")).toContain('"contrast":true');
  });
});
