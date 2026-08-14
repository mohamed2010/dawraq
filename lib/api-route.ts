import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthenticationError } from "./auth";

const knownMessages: Record<string, { status: number; message: string }> = {
  ONGOING_PERIOD_EXISTS: { status: 409, message: "يوجد حيض مستمر بالفعل. أضيفي تاريخ النهاية أولاً أو عدّلي السجل الحالي." },
  RECORD_NOT_FOUND: { status: 404, message: "لم يتم العثور على هذا السجل." },
  DAILY_ENTRY_NOT_FOUND: { status: 404, message: "لم يتم العثور على متابعة هذا اليوم." },
};

export function routeError(error: unknown) {
  if (error instanceof AuthenticationError) return NextResponse.json({ error: error.message }, { status: 401 });
  if (error instanceof ZodError) return NextResponse.json({ error: "راجعي البيانات المدخلة ثم حاولي مرة أخرى." }, { status: 400 });
  const message = error instanceof Error ? error.message : "";
  if (knownMessages[message]) return NextResponse.json({ error: knownMessages[message].message }, { status: knownMessages[message].status });
  console.error("[API] Unexpected route error", error);
  return NextResponse.json({ error: "تعذر حفظ البيانات الآن. لم يتم حذف أي بيانات." }, { status: 500 });
}

export async function jsonBody(request: Request) {
  try { return await request.json(); } catch { throw new ZodError([]); }
}
export function parseJsonArray(value: string) { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
