// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DailyHealthPanel, ProfileHealthPanel } from "../client/src/components/ReferenceFeaturePanels";

const dailyEntry = { id: 4, entryDate: "2026-08-14", mood: "neutral" as const, painLevel: 3, symptoms: ["إرهاق"], notes: "ملاحظة خاصة" };

describe("Reference feature panel interactions", () => {
  afterEach(() => cleanup());

  it("opens a saved daily entry, submits changed health data, and supports deletion", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => undefined);
    const onDelete = vi.fn();
    const { rerender } = render(<DailyHealthPanel entryDate="2026-08-14" entry={dailyEntry} busy={false} onSave={onSave} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: /تعديل متابعة اليوم/ }));
    await user.click(screen.getByRole("button", { name: /قلقة/ }));
    await user.click(screen.getByRole("button", { name: /حفظ متابعة اليوم/ }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ entryDate: "2026-08-14", mood: "anxious", painLevel: 3, symptoms: ["إرهاق"], notes: "ملاحظة خاصة" }));

    rerender(<DailyHealthPanel entryDate="2026-08-15" entry={dailyEntry} busy={false} onSave={onSave} onDelete={onDelete} />);
    await user.click(screen.getByRole("button", { name: "حذف متابعة اليوم" }));
    expect(onDelete).toHaveBeenCalledWith(dailyEntry);
  });

  it("prevents a busy daily save and forwards personalized profile preferences", async () => {
    const user = userEvent.setup();
    const onProfileSave = vi.fn(async () => undefined);
    const { rerender } = render(<DailyHealthPanel entryDate="2026-08-14" entry={null} busy={true} onSave={async () => undefined} onDelete={() => undefined} />);
    expect(screen.getByRole("button", { name: /جارٍ الحفظ/ }).disabled).toBe(true);

    rerender(<ProfileHealthPanel profile={{ typicalBleedingDays: 5, relationshipStatus: "single", pregnancyStatus: "not_pregnant" }} busy={false} onSave={onProfileSave} />);
    const durationInput = screen.getByDisplayValue("5");
    await user.clear(durationInput);
    await user.type(durationInput, "6");
    await user.click(screen.getByRole("button", { name: "متزوجة" }));
    await user.click(screen.getByRole("button", { name: "حامل" }));
    await user.click(screen.getByRole("button", { name: /حفظ تفضيلات المتابعة/ }));
    await waitFor(() => expect(onProfileSave).toHaveBeenCalledWith({ typicalBleedingDays: 6, relationshipStatus: "married", pregnancyStatus: "pregnant" }));
  });
});
