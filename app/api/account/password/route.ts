import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../../lib/auth";
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
    return NextResponse.json({ success: true });
  } catch (error) { return routeError(error); }
}
