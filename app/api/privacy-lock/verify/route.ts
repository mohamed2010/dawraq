import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../../lib/auth";
import { jsonBody, routeError } from "../../../../lib/api-route";
import { appLockVerifyInput } from "../../../../lib/validation";
import { verifyPassword } from "../../../../lib/password";
import { getAppLockHashForUser } from "../../../../server/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const { pin } = appLockVerifyInput.parse(await jsonBody(request));
    const storedHash = await getAppLockHashForUser(user.id);
    if (!storedHash) throw new Error("APP_LOCK_NOT_SET");
    if (!(await verifyPassword(pin, storedHash))) throw new Error("INVALID_APP_LOCK_PIN");
    return NextResponse.json({ success: true });
  } catch (error) {
    return routeError(error);
  }
}
