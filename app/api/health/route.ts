import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "../../../server/db";

export async function GET() {
  const db = await getDb();
  if (!db) return NextResponse.json({ status: "unavailable" }, { status: 503 });

  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503 });
  }
}
