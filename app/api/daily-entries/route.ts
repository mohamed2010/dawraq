import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../lib/auth";
import { jsonBody, parseJsonArray, routeError } from "../../../lib/api-route";
import { dailyEntryInput } from "../../../lib/validation";
import { listDailyEntriesForUser, saveDailyEntryForUser } from "../../../server/db";
export const runtime = "nodejs";
export async function GET(request: Request) { try { const user = await getAuthenticatedUser(request); const entries = await listDailyEntriesForUser(user.id); return NextResponse.json(entries.map(entry => ({ ...entry, symptoms: parseJsonArray(entry.symptomsJson) }))); } catch (error) { return routeError(error); } }
export async function POST(request: Request) { try { const user = await getAuthenticatedUser(request); await saveDailyEntryForUser(user.id, dailyEntryInput.parse(await jsonBody(request))); return NextResponse.json({ success: true }); } catch (error) { return routeError(error); } }
