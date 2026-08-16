import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../../lib/auth";
import { jsonBody, routeError } from "../../../lib/api-route";
import { healthIntegrationConsentInput } from "../../../lib/validation";
import * as db from "../../../server/db";

export const runtime = "nodejs";

const platformInput = (value: unknown) => healthIntegrationConsentInput.pick({ platform: true }).parse(value).platform;

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const consents = await db.listHealthIntegrationConsentsForUser(user.id);
    return NextResponse.json(consents.map(consent => ({ platform: consent.platform, scopes: JSON.parse(consent.scopesJson) as string[], consentedAt: consent.consentedAt, revokedAt: consent.revokedAt })));
  } catch (error) { return routeError(error); }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const input = healthIntegrationConsentInput.parse(await jsonBody(request));
    const consent = await db.saveHealthIntegrationConsentForUser(user.id, input);
    return NextResponse.json(consent ? { platform: consent.platform, scopes: JSON.parse(consent.scopesJson) as string[], revokedAt: consent.revokedAt } : null);
  } catch (error) { return routeError(error); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    const { platform, action } = await jsonBody(request) as { platform: unknown; action?: unknown };
    const parsedPlatform = platformInput({ platform });
    if (action === "delete") await db.deleteHealthIntegrationConsentForUser(user.id, parsedPlatform);
    else await db.revokeHealthIntegrationConsentForUser(user.id, parsedPlatform);
    return NextResponse.json({ success: true });
  } catch (error) { return routeError(error); }
}
