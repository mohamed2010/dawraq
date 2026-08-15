import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../../../lib/auth";
import { jsonBody, routeError } from "../../../../../lib/api-route";
import { webauthnResponseInput } from "../../../../../lib/validation";
import { clearWebAuthnChallengeForUser, getDevicePasskeyForUser, getValidWebAuthnChallengeForUser, recordDevicePasskeyUseForUser } from "../../../../../server/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let userId: number | null = null;
  try {
    const user = await getAuthenticatedUser(request); userId = user.id;
    const input = webauthnResponseInput.parse(await jsonBody(request));
    const response = input.response as AuthenticationResponseJSON;
    const origin = new URL(request.url);
    const [challenge, passkey] = await Promise.all([getValidWebAuthnChallengeForUser(user.id, "authentication"), getDevicePasskeyForUser(user.id, response.id)]);
    if (!passkey) throw new Error("WEBAUTHN_VERIFICATION_FAILED");
    const verification = await verifyAuthenticationResponse({ response, expectedChallenge: challenge, expectedOrigin: origin.origin, expectedRPID: origin.hostname, requireUserVerification: true, credential: { id: passkey.credentialId, publicKey: new Uint8Array(Buffer.from(passkey.publicKey, "base64url")), counter: passkey.counter, transports: JSON.parse(passkey.transportsJson) as never } });
    if (!verification.verified) throw new Error("WEBAUTHN_VERIFICATION_FAILED");
    await recordDevicePasskeyUseForUser(user.id, passkey.credentialId, verification.authenticationInfo.newCounter);
    return NextResponse.json({ success: true });
  } catch (error) { return routeError(error); } finally { if (userId) await clearWebAuthnChallengeForUser(userId).catch(() => undefined); }
}
