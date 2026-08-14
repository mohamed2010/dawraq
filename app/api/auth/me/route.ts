import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../../lib/auth";
export const runtime = "nodejs";
export async function GET(request: Request) { try { return NextResponse.json(await getAuthenticatedUser(request)); } catch { return NextResponse.json(null, { status: 200 }); } }
