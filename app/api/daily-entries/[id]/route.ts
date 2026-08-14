import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "../../../../lib/auth";
import { routeError } from "../../../../lib/api-route";
import { deleteDailyEntryForUser } from "../../../../server/db";
export const runtime = "nodejs";
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) { try { const user = await getAuthenticatedUser(request); const { id } = await context.params; await deleteDailyEntryForUser(user.id, z.coerce.number().int().positive().parse(id)); return NextResponse.json({ success: true }); } catch (error) { return routeError(error); } }
