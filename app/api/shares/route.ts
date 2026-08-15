import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../lib/auth";
import { jsonBody, routeError } from "../../../lib/api-route";
import { clinicianShareCreateInput } from "../../../lib/validation";
import { createClinicianShareForUser, listClinicianSharesForUser } from "../../../server/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    return NextResponse.json(await listClinicianSharesForUser(user.id));
  } catch (error) { return routeError(error); }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const input = clinicianShareCreateInput.parse(await jsonBody(request));
    const share = await createClinicianShareForUser(user.id, input.expiresInHours);
    return NextResponse.json({ id: share.id, expiresAt: share.expiresAt, url: new URL(`/share/${share.token}`, request.url).toString() }, { status: 201 });
  } catch (error) { return routeError(error); }
}
