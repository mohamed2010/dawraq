import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../../lib/auth";
import { jsonBody, routeError } from "../../../../lib/api-route";
import { restoreBackupForUser } from "../../../../server/db";
import { backupRestoreInput } from "../../../../lib/validation";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const input = backupRestoreInput.parse(await jsonBody(request));
    return NextResponse.json(await restoreBackupForUser(user.id, input.backup));
  } catch (error) { return routeError(error); }
}
