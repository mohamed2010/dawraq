import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "../../../../../lib/auth";
import { jsonBody, routeError } from "../../../../../lib/api-route";
import { medicationDoseInput } from "../../../../../lib/validation";
import { recordMedicationDoseForUser } from "../../../../../server/db";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(request);
    const medicationId = z.coerce.number().int().positive().parse((await params).id);
    const input = medicationDoseInput.parse(await jsonBody(request));
    await recordMedicationDoseForUser(user.id, medicationId, input.doseDate, input.scheduledTime);
    return NextResponse.json({ success: true });
  } catch (error) {
    return routeError(error);
  }
}
