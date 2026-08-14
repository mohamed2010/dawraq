import "dotenv/config";
import { app } from "../server/_core/app.ts";

// Vercel maps this catch-all function to /api/* while preserving the request path for Express.
export default app;
