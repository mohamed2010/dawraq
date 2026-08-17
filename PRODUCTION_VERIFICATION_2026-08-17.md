# Production verification — 2026-08-17

The public domain initially served the legacy Vite shell from an old Service Worker. The exact latest Vercel deployment for commit `a1b68b7` served the Next.js local-account login form, proving the build itself was correct. After clearing the stale browser cache and Service Worker, `https://dawraw.vercel.app/` served the current authenticated/dashboard-capable Next.js application.

After commit `2bdcc6b` completed on Vercel, the public domain served the current local-account login form with email/password fields and the registration toggle. `https://dawraw.vercel.app/robots.txt` returned rules allowing `/` while disallowing `/api/`, `/reset-password/`, and `/share/`, with the correct sitemap URL. `https://dawraw.vercel.app/sitemap.xml` returned one public URL only: `https://dawraw.vercel.app/`.

The browser-based test account flow successfully loaded the dashboard, cycle history, calendar, daily mood/symptom save, medication creation, offline-safe assistant response, settings, themes, stealth mode, and font-size save feedback. The test medication was created under the dedicated test account and must not be treated as real health data.

Local validation after the changes: 25 Vitest files passed, 56 tests passed, `pnpm check` passed, and `pnpm build` passed on Next.js 16.3.1. The remaining production-only tasks are rotating `JWT_SECRET`, configuring `RESEND_API_KEY` and `APP_URL`, verifying the sending domain, and re-running PageSpeed after the current deployment has settled.
