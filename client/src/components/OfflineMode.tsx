"use client";

import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

export function OfflineModeBar({ pendingChanges, onSynchronize }: { pendingChanges: number; onSynchronize: () => Promise<void> }) {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const sync = async () => {
    if (!online || syncing) return;
    setSyncing(true);
    try { await onSynchronize(); } finally { setSyncing(false); }
  };
  useEffect(() => {
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw-v3.js", { updateViaCache: "none" }).catch(() => undefined);
    const markOnline = () => setOnline(true);
    const markOffline = () => setOnline(false);
    window.addEventListener("online", markOnline);
    window.addEventListener("offline", markOffline);
    return () => { window.removeEventListener("online", markOnline); window.removeEventListener("offline", markOffline); };
  }, []);
  useEffect(() => { if (online && pendingChanges) void sync(); }, [online, pendingChanges]);
  if (online && !pendingChanges) return null;
  return <div className={`offline-status ${online ? "sync-pending" : "offline"}`} role="status" aria-live="polite">
    {online ? <Cloud size={17} /> : <CloudOff size={17} />}
    <span>{online ? `هناك ${pendingChanges} تغيير/تغييرات محفوظة محلياً وجارٍ إرسالها.` : "أنتِ الآن دون اتصال. يمكنكِ تسجيل الدورة والمتابعة اليومية، وسيتم الحفظ محلياً."}</span>
    {online && <button type="button" onClick={() => void sync()} disabled={syncing}>{syncing ? "جارٍ الإرسال…" : <><RefreshCw size={15} />مزامنة الآن</>}</button>}
  </div>;
}
