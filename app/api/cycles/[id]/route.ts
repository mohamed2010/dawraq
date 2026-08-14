import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "../../../../lib/auth";
import { jsonBody, routeError } from "../../../../lib/api-route";
import { cycleInput } from "../../../../lib/validation";
import { deleteCycleRecordForUser, updateCycleRecordForUser } from "../../../../server/db";
export const runtime = "nodejs"; const recordId = z.coerce.number().int().positive();
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) { try { const user = await getAuthenticatedUser(request); const { id } = await context.params; await updateCycleRecordForUser(user.id, recordId.parse(id), cycleInput.parse(await jsonBody(request))); return NextResponse.json({ success: true }); } catch (error) { return routeError(error); } }
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) { try { const user = await getAuthenticatedUser(request); const { id } = await context.params; await deleteCycleRecordForUser(user.id, recordId.parse(id)); return NextResponse.json({ success: true }); } catch (error) { return routeError(error); } }
