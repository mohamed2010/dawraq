import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../../lib/auth";
import { routeError } from "../../../../lib/api-route";
import { revokeClinicianShareForUser } from "../../../../server/db";

export const runtime = "nodejs";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(request);
    const { id } = await context.params;
    const shareId = Number(id);
    if (!Number.isSafeInteger(shareId) || shareId < 1) return NextResponse.json({ error: "معرّف المشاركة غير صالح." }, { status: 400 });
    await revokeClinicianShareForUser(user.id, shareId);
    return NextResponse.json({ success: true });
  } catch (error) { return routeError(error); }
}
