import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../lib/auth";
import { jsonBody, parseJsonArray, routeError } from "../../../lib/api-route";
import { cycleInput } from "../../../lib/validation";
import { createCycleRecordForUser, listCycleRecordsForUser } from "../../../server/db";
export const runtime = "nodejs";
export async function GET(request: Request) { try { const user = await getAuthenticatedUser(request); const records = await listCycleRecordsForUser(user.id); return NextResponse.json(records.map(record => ({ ...record, symptoms: parseJsonArray(record.symptomsJson) }))); } catch (error) { return routeError(error); } }
export async function POST(request: Request) { try { const user = await getAuthenticatedUser(request); return NextResponse.json({ id: await createCycleRecordForUser(user.id, cycleInput.parse(await jsonBody(request))) }, { status: 201 }); } catch (error) { return routeError(error); } }
