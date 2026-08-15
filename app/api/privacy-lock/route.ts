import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../lib/auth";
import { jsonBody, routeError } from "../../../lib/api-route";
import { appLockInput } from "../../../lib/validation";
import { hashPassword } from "../../../lib/password";
import { getAppLockHashForUser, saveAppLockHashForUser } from "../../../server/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    return NextResponse.json({ enabled: Boolean(await getAppLockHashForUser(user.id)) });
  } catch (error) {
    return routeError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const { pin } = appLockInput.parse(await jsonBody(request));
    await saveAppLockHashForUser(user.id, pin ? await hashPassword(pin) : null);
    return NextResponse.json({ enabled: Boolean(pin) });
  } catch (error) {
    return routeError(error);
  }
}
