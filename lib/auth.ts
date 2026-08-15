import { parse } from "cookie";
import { jwtVerify, SignJWT } from "jose";
import type { User } from "../drizzle/schema";
import * as db from "../server/db";
import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const";

export class AuthenticationError extends Error {
  constructor(message = "يجب تسجيل الدخول للوصول إلى هذه البيانات.") { super(message); }
}

export type AuthenticatedUser = Omit<User, "passwordHash">;

function sessionSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("JWT_SECRET غير مضبوط بصورة آمنة.");
  return new TextEncoder().encode(secret);
}

export function publicUser(user: User): AuthenticatedUser {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

export async function createLocalSession(user: User) {
  return new SignJWT({ userId: user.id, type: "local" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(Math.floor((Date.now() + ONE_YEAR_MS) / 1000))
    .sign(sessionSecret());
}

export async function getAuthenticatedUser(request: Request): Promise<AuthenticatedUser> {
  const sessionToken = parse(request.headers.get("cookie") ?? "")[COOKIE_NAME];
  if (!sessionToken) throw new AuthenticationError();
  try {
    const { payload } = await jwtVerify(sessionToken, sessionSecret(), { algorithms: ["HS256"] });
    if (payload.type !== "local" || typeof payload.userId !== "number") throw new AuthenticationError();
    const user = await db.getUserById(payload.userId);
    if (!user || !user.passwordHash) throw new AuthenticationError();
    return publicUser(user);
  } catch (error) {
    if (error instanceof AuthenticationError) throw error;
    throw new AuthenticationError();
  }
}

export function sessionCookie() {
  return { name: COOKIE_NAME, httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: Math.floor(ONE_YEAR_MS / 1000) };
}
