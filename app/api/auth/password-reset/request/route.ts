import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { isTransactionalEmailConfigured, passwordResetUrl, sendPasswordResetEmail } from "../../../../../lib/email";
import { jsonBody, routeError } from "../../../../../lib/api-route";
import { passwordResetRequestInput } from "../../../../../lib/validation";
import * as db from "../../../../../server/db";

export const runtime = "nodejs";

const genericResponse = () => NextResponse.json({ success: true, message: "إذا كان البريد مسجلاً، ستصل رسالة إعادة التعيين قريباً." });

export async function POST(request: Request) {
  try {
    const input = passwordResetRequestInput.parse(await jsonBody(request));
    const attemptKey = db.loginAttemptKeyForRequest(`reset:${input.email}`, request);
    await db.assertLoginAttemptAllowed(attemptKey);
    const user = await db.getUserByEmail(input.email);
    if (!user || !user.email || !isTransactionalEmailConfigured()) return genericResponse();
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const resetUrl = passwordResetUrl(token);
    if (!resetUrl) return genericResponse();
    await db.createPasswordResetTokenForUser(user.id, tokenHash);
    const delivered = await sendPasswordResetEmail({ to: user.email, resetUrl });
    if (!delivered) await db.invalidatePasswordResetToken(tokenHash);
    await db.clearFailedLoginAttempts(attemptKey);
    return genericResponse();
  } catch (error) {
    if (error instanceof Error && error.message === "LOGIN_THROTTLED") return routeError(error);
    return genericResponse();
  }
}
