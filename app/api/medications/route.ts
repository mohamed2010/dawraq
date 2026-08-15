import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../lib/auth";
import { jsonBody, parseJsonArray, routeError } from "../../../lib/api-route";
import { medicationInput } from "../../../lib/validation";
import { createMedicationForUser, listMedicationsForUser } from "../../../server/db";

export const runtime = "nodejs";

function responseMedication(medication: { reminderTimesJson: string }) {
  return { ...medication, reminderTimes: parseJsonArray(medication.reminderTimesJson).filter((value): value is string => typeof value === "string") };
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const medications = await listMedicationsForUser(user.id);
    return NextResponse.json(medications.map(responseMedication));
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const id = await createMedicationForUser(user.id, medicationInput.parse(await jsonBody(request)));
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
