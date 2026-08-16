import { NextResponse } from "next/server";
import * as db from "../../../../server/db";
import { createLocalSession, publicUser, sessionCookie } from "../../../../lib/auth";
import { verifyPassword } from "../../../../lib/password";
import { routeError, jsonBody } from "../../../../lib/api-route";
import { loginInput } from "../../../../lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = loginInput.parse(await jsonBody(request));
    const attemptKey = db.loginAttemptKeyForRequest(input.email, request);
    await db.assertLoginAttemptAllowed(attemptKey);
    const user = await db.getUserByEmail(input.email);
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      await db.recordFailedLoginAttempt(attemptKey);
      throw new Error("INVALID_CREDENTIALS");
    }
    await db.clearFailedLoginAttempts(attemptKey);
    await db.recordLocalSignIn(user.id);
    const response = NextResponse.json({ user: publicUser(user) });
    response.cookies.set(sessionCookie().name, await createLocalSession(user), sessionCookie());
    return response;
  } catch (error) {
    return routeError(error);
  }
}
