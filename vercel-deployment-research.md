# Vercel deployment research

The current Vercel failure is consistent with a full-stack Express bundle being treated as a static output file. The official Vercel Express guidance states that an Express application must be detected from an application entry file and exported as the default Express application or run with a listener. It also states that `express.static()` is ignored on Vercel; public browser assets must be placed under `public/**`.

The Vite documentation explains that a Vite build emits static client assets, while serverless functions need framework-native support or a compatible server-side integration. For static Vite SPAs, a `vercel.json` rewrite can route deep links to `index.html`; that alone does not provide the required API, OAuth, or database runtime for this application.

Because the current application requires OAuth callbacks, protected tRPC APIs, and a database, the safest deployment path is the managed full-stack hosting supplied with this project. If Vercel remains required, it needs a Vercel-specific Express function entry and its own matching environment variables; Vercel cannot serve the generated `dist/index.js` as a static root document.

## Sources

1. [Vercel: Express on Vercel](https://vercel.com/docs/frameworks/backend/express)
2. [Vercel: Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)
3. [Vercel: Build Output API primitives](https://vercel.com/docs/build-output-api/primitives)
4. [Vercel: Project configuration with vercel.json](https://vercel.com/docs/project-configuration/vercel-json)
