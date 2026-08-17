import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const offlineSource = readFileSync(new URL("../client/src/components/OfflineMode.tsx", import.meta.url), "utf8");
const serviceWorkerSource = readFileSync(new URL("../public/sw-v3.js", import.meta.url), "utf8");

describe("service worker deployment safety", () => {
  it("registers the versioned worker without using the browser cache for the worker script", () => {
    expect(offlineSource).toContain('register("/sw-v3.js", { updateViaCache: "none" })');
    expect(offlineSource).not.toContain('register("/sw.js")');
  });

  it("does not cache HTML navigations and removes older shell caches", () => {
    expect(serviceWorkerSource).toContain('const CACHE_NAME = "zuhaira-shell-v3"');
    expect(serviceWorkerSource).toContain('request.mode === "navigate" || acceptsHtml');
    expect(serviceWorkerSource).toContain('fetch(request, { cache: "no-store" })');
    expect(serviceWorkerSource).toContain('key !== CACHE_NAME');
  });
});
