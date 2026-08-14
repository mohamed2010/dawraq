import "dotenv/config";
import { app } from "./server/_core/app.ts";

// Vercel serves the production Vite output from /public. Keeping this catch-all
// handler after the Express API routes preserves /api/trpc and /api/oauth/callback.
app.use((req, res) => {
  res.sendFile("index.html", { root: new URL("./public", import.meta.url).pathname });
});

// Vercel detects this root entry as the Express application and mounts it as one serverless function.
export default app;
