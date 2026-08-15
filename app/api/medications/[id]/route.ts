import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "../../../../lib/auth";
import { jsonBody, routeError } from "../../../../lib/api-route";
import { medicationInput } from "../../../../lib/validation";
import { deleteMedicationForUser, updateMedicationForUser } from "../../../../server/db";

export const runtime = "nodejs";

async function medicationId(params: Promise<{ id: string }>) {
  return z.coerce.number().int().positive().parse((await params).id);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(request);
    await updateMedicationForUser(user.id, await medicationId(params), medicationInput.parse(await jsonBody(request)));
    return NextResponse.json({ success: true });
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(request);
    await deleteMedicationForUser(user.id, await medicationId(params));
    return NextResponse.json({ success: true });
  } catch (error) {
    return routeError(error);
  }
}
