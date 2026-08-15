import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../../../lib/auth";
import { routeError } from "../../../../../lib/api-route";
import { listDevicePasskeysForUser, saveWebAuthnChallengeForUser } from "../../../../../server/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const origin = new URL(request.url);
    const passkeys = await listDevicePasskeysForUser(user.id);
    if (!passkeys.length) return NextResponse.json({ error: "لم يتم تفعيل قفل الجهاز." }, { status: 400 });
    const options = await generateAuthenticationOptions({ rpID: origin.hostname, userVerification: "required", allowCredentials: passkeys.map(item => ({ id: item.credentialId, transports: JSON.parse(item.transportsJson) as never })) });
    await saveWebAuthnChallengeForUser(user.id, "authentication", options.challenge);
    return NextResponse.json(options);
  } catch (error) { return routeError(error); }
}
