# PageSpeed and SEO audit baseline

Measurement date: 2026-08-16 (Google PageSpeed Insights report shown at 21:39–21:40 local browser time).
Target: https://dawraw.vercel.app (public landing page, unauthenticated).

## PageSpeed Insights

### Mobile / smartphone
- Performance: 85
- Accessibility: 98
- Best Practices: 100
- SEO: 100
- Core metrics shown in the report: FCP 2.6 s, LCP 3.5 s, TBT 41 ms, CLS 0, Speed Index 4.371 s.
- Main opportunities: render-blocking requests with estimated savings of 1,780 ms; reduce unused JavaScript with estimated savings of 103 KiB; legacy JavaScript with estimated savings of 14 KiB; one long main-thread task; critical request chaining; third-party font requests; total network payload about 323 KiB.

### Desktop / computer
- Performance: 99
- Accessibility: 98
- Best Practices: 100
- SEO: 100
- Core metrics shown in the report: FCP 0.7 s, LCP 0.8 s, TBT 0 ms, CLS 0.01, Speed Index 0.934 s.
- Main opportunities: render-blocking requests with estimated savings of 430 ms; reduce unused JavaScript with estimated savings of 103 KiB; legacy JavaScript with estimated savings of 14 KiB; critical request chaining; font requests; layout-shift investigation; total network payload about 323 KiB.

The scores are lab measurements and can vary between runs. Mobile is the priority because it has the lower performance score and slower LCP.

## Production SEO surface

- The public HTML returns `html lang="ar" dir="rtl"`.
- The page has a title: `زُهيرة أونلاين`.
- The page has a meta description: `متابعة خاصة وآمنة للدورة الشهرية والأعراض.`.
- `/robots.txt` currently returns HTTP 404.
- `/sitemap.xml` currently returns HTTP 404.
- No canonical, Open Graph, Twitter Card, or robots meta tags were found in the inspected public HTML.
- `app/layout.tsx` defines basic Next metadata and a manifest but no explicit metadataBase, canonical, Open Graph, Twitter, robots, or icons block.
- `app/page.tsx` renders the client-heavy authenticated Home component directly. The landing copy exists in the client component, while authenticated dashboard content must remain private and non-indexable.

## Initial plan implications

1. Add `app/robots.ts` and `app/sitemap.ts` with only public routes; do not list authenticated dashboard paths or private share tokens.
2. Add canonical origin, Arabic Open Graph/Twitter metadata, theme/icon metadata, and explicit robots policy for the public landing page.
3. Consider a small server-rendered public landing shell separate from the authenticated dashboard so crawlers receive stable semantic H1/content without loading the full private app bundle.
4. Reduce mobile render-blocking work: self-host or preload only the required Arabic font weights, defer non-critical font loading, and inspect the CSS chunk responsible for the 1.78 s estimated savings.
5. Reduce unused JavaScript by splitting the authenticated dashboard panels and loading heavy tools only when opened; keep the public landing bundle small.
6. Re-run mobile and desktop PageSpeed after each batch; acceptance target is mobile Performance >= 90, LCP <= 2.5 s, Accessibility >= 98, Best Practices = 100, SEO = 100, with no regression in private-route behavior.
