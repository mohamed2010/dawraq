import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const layoutSource = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
const pageSource = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const robotsSource = readFileSync(new URL("../app/robots.ts", import.meta.url), "utf8");
const sitemapSource = readFileSync(new URL("../app/sitemap.ts", import.meta.url), "utf8");

describe("public SEO safeguards", () => {
  it("declares Arabic canonical and social metadata without private route content", () => {
    expect(layoutSource).toContain('metadataBase: new URL(siteUrl)');
    expect(layoutSource).toContain('canonical: "/"');
    expect(layoutSource).toContain('locale: "ar_EG"');
    expect(pageSource).toContain('"@type": "WebApplication"');
    expect(pageSource).toContain('type="application/ld+json"');
  });

  it("keeps private and operational routes out of search discovery", () => {
    expect(robotsSource).toContain('"/api/"');
    expect(robotsSource).toContain('"/reset-password/"');
    expect(robotsSource).toContain('"/share/"');
    expect(sitemapSource).toContain('https://dawraw.vercel.app/');
    expect(sitemapSource).not.toContain("/api/");
  });
});
