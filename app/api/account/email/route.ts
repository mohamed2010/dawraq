import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../../lib/auth";
import { jsonBody, routeError } from "../../../../lib/api-route";
import { verifyPassword } from "../../../../lib/password";
import { accountEmailChangeInput } from "../../../../lib/validation";
import { getUserById, updateEmailForUser } from "../../../../server/db";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const input = accountEmailChangeInput.parse(await jsonBody(request));
    const current = await getUserById(user.id);
    if (!current || !(await verifyPassword(input.currentPassword, current.passwordHash))) throw new Error("INVALID_CURRENT_PASSWORD");
    const updated = await updateEmailForUser(user.id, input.email);
    return NextResponse.json({ email: updated.email });
  } catch (error) { return routeError(error); }
}
