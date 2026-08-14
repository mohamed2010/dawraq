import "dotenv/config";
import { app } from "../../server/_core/app.ts";

// Exact catch-all function for the relative tRPC client path: /api/trpc/*.
export default app;
