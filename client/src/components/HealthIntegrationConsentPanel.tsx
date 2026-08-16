"use client";

import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Platform = "apple_health" | "health_connect";
type Scope = "cycle_dates" | "daily_symptoms" | "medications";
type HealthConsent = { platform: Platform; scopes: Scope[]; consentedAt: string; revokedAt: string | null };

const platformLabels: Record<Platform, string> = { apple_health: "Apple Health", health_connect: "Health Connect" };
const scopeLabels: Record<Scope, string> = { cycle_dates: "تواريخ الدورة", daily_symptoms: "الأعراض اليومية", medications: "الأدوية" };

export function HealthIntegrationConsentPanel() {
  const [consents, setConsents] = useState<HealthConsent[]>([]);
  const [platform, setPlatform] = useState<Platform>("health_connect");
  const [scopes, setScopes] = useState<Scope[]>(["cycle_dates"]);
  const [busy, setBusy] = useState(false);
  const load = async () => {
    const response = await fetch("/api/health-integrations", { credentials: "include" });
    if (response.ok) setConsents(await response.json() as HealthConsent[]);
  };
  useEffect(() => { void load(); }, []);
  const save = async () => {
    if (!scopes.length) return toast.error("اختاري نوعاً واحداً من البيانات على الأقل.");
    setBusy(true);
    try {
      const response = await fetch("/api/health-integrations", { method: "PUT", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ platform, scopes }) });
      if (!response.ok) throw new Error();
      await load();
      toast.success("حُفظت موافقتكِ محلياً. لا توجد مزامنة خارجية مفعّلة بعد.");
    } catch { toast.error("تعذر حفظ الموافقة الآن."); } finally { setBusy(false); }
  };
  const remove = async (target: Platform, action: "revoke" | "delete") => {
    setBusy(true);
    try {
      const response = await fetch("/api/health-integrations", { method: "DELETE", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ platform: target, action }) });
      if (!response.ok) throw new Error();
      await load();
      toast.success(action === "delete" ? "حُذفت بيانات الموافقة." : "تم إلغاء الموافقة.");
    } catch { toast.error("تعذر تحديث الموافقة الآن."); } finally { setBusy(false); }
  };
  return <section className="surface-card page-card privacy-tools"><div className="section-header"><div><h2>تكاملات الصحة الاختيارية</h2><p>هذا التطبيق لا يزامن حالياً مع Apple Health أو Health Connect. الموافقة هنا مجرد إعداد محلي قابل للإلغاء والحذف.</p></div><ShieldCheck size={21} color="var(--green)" /></div><div className="settings-group form-stack"><h3>اختيار موافقة مستقبلية</h3><div className="field"><label htmlFor="health-platform">المنصة</label><select id="health-platform" value={platform} onChange={event => setPlatform(event.target.value as Platform)}><option value="health_connect">Health Connect</option><option value="apple_health">Apple Health</option></select></div><div className="field"><span className="field-hint">اختاري أقل قدر من البيانات. لن تبدأ أي مزامنة إلا بعد تنفيذ تكامل منفصل ومراجعة الموافقة.</span>{(Object.keys(scopeLabels) as Scope[]).map(scope => <label key={scope} className="flex items-center gap-2 py-1"><input type="checkbox" checked={scopes.includes(scope)} onChange={event => setScopes(current => event.target.checked ? [...new Set([...current, scope])] : current.filter(item => item !== scope))} />{scopeLabels[scope]}</label>)}</div><button className="secondary-button" type="button" onClick={() => void save()} disabled={busy}>حفظ الموافقة</button></div>{consents.length > 0 && <div className="settings-group"><h3>الموافقات المحفوظة</h3>{consents.map(consent => <div className="notification-card" key={consent.platform}><div><strong>{platformLabels[consent.platform]}</strong><span>{consent.revokedAt ? "الموافقة ملغاة" : `النطاق: ${consent.scopes.map(scope => scopeLabels[scope] ?? scope).join("، ")}`}</span></div><div className="day-actions"><button className="secondary-button" type="button" disabled={busy || Boolean(consent.revokedAt)} onClick={() => void remove(consent.platform, "revoke")}>إلغاء</button><button className="danger-button" type="button" disabled={busy} onClick={() => void remove(consent.platform, "delete")}>حذف</button></div></div>)}</div>}</section>;
}
