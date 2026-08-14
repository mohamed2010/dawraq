import "dotenv/config";
import { app } from "../server/_core/app";

// Vercel detects this catch-all file as the serverless handler for all /api/* routes.
export default app;
