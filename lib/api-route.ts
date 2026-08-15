import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthenticationError } from "./auth";

const knownMessages: Record<string, { status: number; message: string }> = {
  ACCOUNT_EXISTS: { status: 409, message: "يوجد حساب مسجل بهذا البريد الإلكتروني بالفعل." },
  INVALID_CREDENTIALS: { status: 401, message: "البريد الإلكتروني أو كلمة المرور غير صحيحين." },
  ONGOING_PERIOD_EXISTS: { status: 409, message: "يوجد حيض مستمر بالفعل. أضيفي تاريخ النهاية أولاً أو عدّلي السجل الحالي." },
  RECORD_NOT_FOUND: { status: 404, message: "لم يتم العثور على هذا السجل." },
  DAILY_ENTRY_NOT_FOUND: { status: 404, message: "لم يتم العثور على متابعة هذا اليوم." },
  MEDICATION_NOT_FOUND: { status: 404, message: "لم يتم العثور على هذا الدواء في ملفكِ." },
  APP_LOCK_NOT_SET: { status: 409, message: "لم يتم إعداد رمز قفل للتطبيق بعد." },
  INVALID_APP_LOCK_PIN: { status: 401, message: "رمز قفل التطبيق غير صحيح." },
  INVALID_CURRENT_PASSWORD: { status: 401, message: "كلمة المرور الحالية غير صحيحة." },
  WEBAUTHN_CHALLENGE_EXPIRED: { status: 409, message: "انتهت محاولة قفل الجهاز. ابدئي المحاولة مرة أخرى." },
  WEBAUTHN_VERIFICATION_FAILED: { status: 401, message: "تعذر التحقق من قفل الجهاز." },
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
