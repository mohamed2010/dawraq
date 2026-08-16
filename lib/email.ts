type PasswordResetEmail = { to: string; resetUrl: string };

function resendConfiguration() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const appUrl = process.env.APP_URL;
  if (!apiKey || !from || !appUrl) return null;
  try {
    const normalizedUrl = new URL(appUrl);
    if (normalizedUrl.protocol !== "https:") return null;
    return { apiKey, from, appUrl: normalizedUrl.origin };
  } catch {
    return null;
  }
}

export function isTransactionalEmailConfigured() {
  return Boolean(resendConfiguration());
}

export function passwordResetUrl(token: string) {
  const configuration = resendConfiguration();
  return configuration ? `${configuration.appUrl}/reset-password?token=${encodeURIComponent(token)}` : null;
}

export async function sendPasswordResetEmail({ to, resetUrl }: PasswordResetEmail) {
  const configuration = resendConfiguration();
  if (!configuration) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${configuration.apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: configuration.from,
      to: [to],
      subject: "إعادة تعيين كلمة مرور زُهيرة",
      html: `<p dir="rtl">طلبتِ إعادة تعيين كلمة مرورك في زُهيرة.</p><p><a href="${resetUrl}">أنشئي كلمة مرور جديدة</a></p><p dir="rtl">ينتهي هذا الرابط خلال 30 دقيقة. إذا لم تطلبي ذلك، يمكنكِ تجاهل الرسالة.</p>`,
      text: `إعادة تعيين كلمة مرور زُهيرة: ${resetUrl}\nينتهي الرابط خلال 30 دقيقة. إذا لم تطلبي ذلك، تجاهلي هذه الرسالة.`,
    }),
  });
  if (!response.ok) {
    console.error("[EMAIL] Password reset delivery failed", response.status);
    return false;
  }
  return true;
}
