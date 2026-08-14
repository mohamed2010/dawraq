import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../lib/auth";
import { jsonBody, routeError } from "../../../lib/api-route";
import { profileInput } from "../../../lib/validation";
import { getProfileForUser, saveProfileForUser } from "../../../server/db";
export const runtime = "nodejs";
export async function GET(request: Request) { try { const user = await getAuthenticatedUser(request); return NextResponse.json(await getProfileForUser(user.id)); } catch (error) { return routeError(error); } }
export async function PUT(request: Request) { try { const user = await getAuthenticatedUser(request); return NextResponse.json(await saveProfileForUser(user.id, profileInput.parse(await jsonBody(request)))); } catch (error) { return routeError(error); } }
