import "dotenv/config";
import { app } from "./server/_core/app.ts";

// Vercel detects this root entry as the Express application and mounts it as one serverless function.
export default app;
