import { NextResponse } from "next/server";
import { sessionCookie } from "../../../../lib/auth";
import { sdk } from "../../../../server/_core/sdk";
import * as db from "../../../../server/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, openId } = body;

    if (!email && !openId) {
      return NextResponse.json({ error: "البريد الإلكتروني مطلوب" }, { status: 400 });
    }

    const effectiveOpenId = openId || `user_${Buffer.from(email).toString("base64url").slice(0, 32)}`;
    const effectiveName = name || email?.split("@")[0] || "مستخدمة زُهيرة";

    await db.upsertUser({
      openId: effectiveOpenId,
      name: effectiveName,
      email: email || null,
      loginMethod: "supabase_auth",
      lastSignedIn: new Date(),
    });

    const token = await sdk.createSessionToken(
      effectiveOpenId,
      {
        name: effectiveName,
        expiresInMs: 60 * 60 * 24 * 365 * 1000,
      }
    );

    const response = NextResponse.json({ success: true, user: { openId: effectiveOpenId, name: effectiveName, email } });
    response.cookies.set({
      ...sessionCookie(),
      value: token,
    });

    return response;
  } catch (error) {
    console.error("[Login Error]", error);
    return NextResponse.json({ error: "فشل تسجيل الدخول" }, { status: 500 });
  }
}
