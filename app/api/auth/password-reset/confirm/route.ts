import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createLocalSession, publicUser, sessionCookie } from "../../../../../lib/auth";
import { jsonBody, routeError } from "../../../../../lib/api-route";
import { hashPassword } from "../../../../../lib/password";
import { passwordResetConfirmInput } from "../../../../../lib/validation";
import * as db from "../../../../../server/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = passwordResetConfirmInput.parse(await jsonBody(request));
    const tokenHash = createHash("sha256").update(input.token).digest("hex");
    const userId = await db.consumePasswordResetToken(tokenHash, await hashPassword(input.newPassword));
    if (!userId) throw new Error("INVALID_RESET_TOKEN");
    const user = await db.getUserById(userId);
    if (!user) throw new Error("INVALID_RESET_TOKEN");
    const response = NextResponse.json({ user: publicUser(user) });
    response.cookies.set(sessionCookie().name, await createLocalSession(user), sessionCookie());
    return response;
  } catch (error) { return routeError(error); }
}
