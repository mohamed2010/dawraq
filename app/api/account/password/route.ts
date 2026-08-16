import { NextResponse } from "next/server";
import { createLocalSession, getAuthenticatedUser, sessionCookie } from "../../../../lib/auth";
import { jsonBody, routeError } from "../../../../lib/api-route";
import { hashPassword, verifyPassword } from "../../../../lib/password";
import { accountPasswordChangeInput } from "../../../../lib/validation";
import { getUserById, updatePasswordForUser } from "../../../../server/db";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const input = accountPasswordChangeInput.parse(await jsonBody(request));
    const current = await getUserById(user.id);
    if (!current || !(await verifyPassword(input.currentPassword, current.passwordHash))) throw new Error("INVALID_CURRENT_PASSWORD");
    if (input.currentPassword === input.newPassword) return NextResponse.json({ error: "اختاري كلمة مرور جديدة مختلفة." }, { status: 400 });
    await updatePasswordForUser(user.id, await hashPassword(input.newPassword));
    const refreshed = await getUserById(user.id);
    if (!refreshed) throw new Error("RECORD_NOT_FOUND");
    const response = NextResponse.json({ success: true });
    response.cookies.set(sessionCookie().name, await createLocalSession(refreshed), sessionCookie());
    return response;
  } catch (error) { return routeError(error); }
}
