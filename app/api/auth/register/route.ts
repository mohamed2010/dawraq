import { NextResponse } from "next/server";
import * as db from "../../../../server/db";
import { createLocalSession, publicUser, sessionCookie } from "../../../../lib/auth";
import { hashPassword } from "../../../../lib/password";
import { routeError, jsonBody } from "../../../../lib/api-route";
import { registerInput } from "../../../../lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = registerInput.parse(await jsonBody(request));
    const user = await db.createLocalUser({ name: input.name, email: input.email, passwordHash: await hashPassword(input.password) });
    const response = NextResponse.json({ user: publicUser(user) }, { status: 201 });
    response.cookies.set(sessionCookie().name, await createLocalSession(user), sessionCookie());
    return response;
  } catch (error) {
    return routeError(error);
  }
}
