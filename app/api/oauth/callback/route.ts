import { NextResponse } from "next/server";
import { OAUTH_STATE_COOKIE, ONE_YEAR_MS, decodeOAuthState } from "../../../../shared/const";
import * as db from "../../../../server/db";
import { sdk } from "../../../../server/_core/sdk";
import { sessionCookie } from "../../../../lib/auth";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const url = new URL(request.url); const code = url.searchParams.get("code"); const state = url.searchParams.get("state");
  if (!code || !state) return NextResponse.json({ error: "code and state are required" }, { status: 400 });
  const { nonce } = decodeOAuthState(state); const expectedNonce = request.headers.get("cookie")?.match(/(?:^|;\s*)__Host-oauth_state=([^;]+)/)?.[1];
  if (!nonce || nonce !== expectedNonce) return NextResponse.json({ error: "invalid oauth state" }, { status: 403 });
  try {
    const tokenResponse = await sdk.exchangeCodeForToken(code, state); const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
    if (!userInfo.openId) return NextResponse.json({ error: "openId missing from user info" }, { status: 400 });
    await db.upsertUser({ openId: userInfo.openId, name: userInfo.name || null, email: userInfo.email ?? null, loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null, lastSignedIn: new Date() });
    const token = await sdk.createSessionToken(userInfo.openId, { name: userInfo.name || "", expiresInMs: ONE_YEAR_MS }); const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set({ name: OAUTH_STATE_COOKIE, value: "", path: "/", secure: true, sameSite: "none", maxAge: 0 }); response.cookies.set({ ...sessionCookie(), value: token }); return response;
  } catch (error) { console.error("[OAuth] Callback failed", error); return NextResponse.json({ error: "OAuth callback failed" }, { status: 500 }); }
}
