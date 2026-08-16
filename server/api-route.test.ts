import { afterEach, describe, expect, it, vi } from "vitest";
import { routeError } from "../lib/api-route";

describe("routeError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs only a safe error category for unexpected failures", async () => {
    const sensitiveError = new Error(
      'Failed query: select * from users where email = $1; params: private.user@example.com',
    );
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = routeError(sensitiveError);

    expect(consoleSpy).toHaveBeenCalledWith("[API] Unexpected route error", "Error");
    expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("private.user@example.com");
    expect(await response.json()).toEqual({ error: "تعذر حفظ البيانات الآن. لم يتم حذف أي بيانات." });
    expect(response.status).toBe(500);
  });
});
