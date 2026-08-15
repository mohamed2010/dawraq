import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../lib/auth";
import { routeError } from "../../../lib/api-route";
import { getPersonalHealthSummaryForUser } from "../../../server/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const summary = await getPersonalHealthSummaryForUser(user.id);
    return NextResponse.json({ generatedAt: new Date().toISOString(), ...summary });
  } catch (error) {
    return routeError(error);
  }
}
