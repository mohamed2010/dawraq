import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "../../../server/db";

export async function GET() {
  const db = await getDb();
  if (!db) return NextResponse.json({ status: "ok", framework: "nextjs", database: "not_configured" }, { status: 503 });

  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ status: "ok", framework: "nextjs", database: "connected" });
  } catch {
    return NextResponse.json({ status: "ok", framework: "nextjs", database: "unavailable" }, { status: 503 });
  }
}
