import { NextResponse } from "next/server";
import { sessionCookie } from "../../../../lib/auth";
export const runtime = "nodejs";
export async function POST() { const response = NextResponse.json({ success: true }); response.cookies.set({ ...sessionCookie(), value: "", maxAge: 0 }); return response; }
