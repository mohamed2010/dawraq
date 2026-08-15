import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../lib/auth";
import { jsonBody, routeError } from "../../../lib/api-route";
import { accountDeletionInput } from "../../../lib/validation";
import { deleteUserAndDataForUser } from "../../../server/db";

export const runtime = "nodejs";

export async function DELETE(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    accountDeletionInput.parse(await jsonBody(request));
    await deleteUserAndDataForUser(user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return routeError(error);
  }
}
