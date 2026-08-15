import { generateRegistrationOptions } from "@simplewebauthn/server";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../../../lib/auth";
import { routeError } from "../../../../../lib/api-route";
import { listDevicePasskeysForUser, saveWebAuthnChallengeForUser } from "../../../../../server/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const origin = new URL(request.url);
    const existing = await listDevicePasskeysForUser(user.id);
    const options = await generateRegistrationOptions({ rpName: "زُهيرة", rpID: origin.hostname, userID: new TextEncoder().encode(String(user.id)), userName: user.email ?? `user-${user.id}`, userDisplayName: user.name ?? "مستخدمة زُهيرة", attestationType: "none", authenticatorSelection: { residentKey: "preferred", userVerification: "required" }, excludeCredentials: existing.map(item => ({ id: item.credentialId, transports: JSON.parse(item.transportsJson) as never })) });
    await saveWebAuthnChallengeForUser(user.id, "registration", options.challenge);
    return NextResponse.json(options);
  } catch (error) { return routeError(error); }
}
