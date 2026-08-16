import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("browser security headers", () => {
  it("sets baseline hardening headers on every route", async () => {
    const rules = await nextConfig.headers?.();
    const universal = rules?.find(rule => rule.source === "/:path*");

    expect(universal?.headers).toEqual(expect.arrayContaining([
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ]));
  });

  it("prevents sensitive share pages from being indexed or stored by shared caches", async () => {
    const rules = await nextConfig.headers?.();
    const shares = rules?.find(rule => rule.source === "/share/:path*");

    expect(shares?.headers).toEqual(expect.arrayContaining([
      { key: "Cache-Control", value: "private, no-store, max-age=0" },
      { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" },
    ]));
  });
});
