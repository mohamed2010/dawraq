import { parse } from "cookie";
import { COOKIE_NAME } from "../shared/const";
import * as db from "../server/db";
import { sdk, type AuthenticatedUser } from "../server/_core/sdk";

export class AuthenticationError extends Error {
  constructor(message = "يجب تسجيل الدخول للوصول إلى هذه البيانات.") { super(message); this.name = "AuthenticationError"; }
}

function getSessionToken(request: Request) {
  const cookieValue = parse(request.headers.get("cookie") ?? "")[COOKIE_NAME];
  if (cookieValue) return cookieValue;
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
}

export async function getAuthenticatedUser(request: Request): Promise<AuthenticatedUser> {
  const sessionToken = getSessionToken(request);
  const session = await sdk.verifySession(sessionToken);
  if (!session) throw new AuthenticationError();
  let user = await db.getUserByOpenId(session.openId);
  if (!user) {
    try {
      const userInfo = await sdk.getUserInfoWithJwt(sessionToken ?? "");
      if (userInfo.openId !== session.openId) throw new AuthenticationError();
      await db.upsertUser({ openId: userInfo.openId, name: userInfo.name || null, email: userInfo.email ?? null, loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null, lastSignedIn: new Date() });
      user = await db.getUserByOpenId(session.openId);
    } catch (error) {
      if (error instanceof AuthenticationError) throw error;
      throw new AuthenticationError("تعذر التحقق من جلسة تسجيل الدخول.");
    }
  }
  if (!user) throw new AuthenticationError();
  await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
  return user;
}

export function sessionCookie() {
  return { name: COOKIE_NAME, httpOnly: true, sameSite: "none" as const, secure: true, path: "/", maxAge: 60 * 60 * 24 * 365 };
}
