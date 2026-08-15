import { verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../../../lib/auth";
import { jsonBody, routeError } from "../../../../../lib/api-route";
import { webauthnResponseInput } from "../../../../../lib/validation";
import { clearWebAuthnChallengeForUser, getValidWebAuthnChallengeForUser, saveDevicePasskeyForUser } from "../../../../../server/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let userId: number | null = null;
  try {
    const user = await getAuthenticatedUser(request); userId = user.id;
    const input = webauthnResponseInput.parse(await jsonBody(request));
    const origin = new URL(request.url);
    const challenge = await getValidWebAuthnChallengeForUser(user.id, "registration");
    const verification = await verifyRegistrationResponse({ response: input.response as RegistrationResponseJSON, expectedChallenge: challenge, expectedOrigin: origin.origin, expectedRPID: origin.hostname, requireUserVerification: true });
    if (!verification.verified) throw new Error("WEBAUTHN_VERIFICATION_FAILED");
    const credential = verification.registrationInfo.credential;
    await saveDevicePasskeyForUser(user.id, { id: credential.id, publicKey: Buffer.from(credential.publicKey).toString("base64url"), counter: credential.counter, transports: (credential.transports ?? []) as string[] });
    return NextResponse.json({ enabled: true });
  } catch (error) { return routeError(error); } finally { if (userId) await clearWebAuthnChallengeForUser(userId).catch(() => undefined); }
}
