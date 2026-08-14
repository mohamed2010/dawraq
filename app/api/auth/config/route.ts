import { NextResponse } from "next/server";
export async function GET() { return NextResponse.json({ appId: process.env.VITE_APP_ID ?? "", oauthPortalUrl: process.env.VITE_OAUTH_PORTAL_URL ?? "" }); }
