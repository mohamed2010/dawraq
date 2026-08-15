import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../lib/auth";
import { routeError } from "../../../lib/api-route";
import { deleteDevicePasskeysForUser, getDevicePasskeyStatusForUser } from "../../../server/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try { const user = await getAuthenticatedUser(request); return NextResponse.json(await getDevicePasskeyStatusForUser(user.id)); } catch (error) { return routeError(error); }
}

export async function DELETE(request: Request) {
  try { const user = await getAuthenticatedUser(request); await deleteDevicePasskeysForUser(user.id); return NextResponse.json({ enabled: false }); } catch (error) { return routeError(error); }
}
