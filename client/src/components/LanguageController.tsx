"use client";

import { useEffect } from "react";

export type AppLanguage = "ar" | "en";
export const languageDocumentAttributes = (language: AppLanguage) => ({ lang: language, dir: language === "ar" ? "rtl" : "ltr" as const });

const english: Record<string, string> = {
  "زُهيرة": "Zuhaira", "مساحتكِ الخاصة لمتابعة دورتكِ": "Your private space for cycle tracking", "فتح الإعدادات": "Open settings", "الرئيسية": "Home", "السجل": "History", "التقويم": "Calendar", "الأدوية": "Medication", "المساعد": "Assistant", "الإعدادات": "Settings", "الإعدادات والخصوصية": "Settings & privacy", "اللغة": "Language", "اختاري لغة التطبيق واتجاه الواجهة المناسبين لكِ.": "Choose your app language and preferred reading direction.", "العربية": "Arabic", "الإنجليزية": "English", "حفظ الملف الشخصي": "Save profile", "ثيم التطبيق": "App theme", "وضع التخفي": "Stealth mode", "الحساب": "Account", "تسجيل الخروج": "Log out", "الأدوية والتذكيرات": "Medication & reminders", "فعّلي تنبيهات المتصفح": "Enable browser notifications", "تنبيهات المتصفح مفعّلة": "Browser notifications are enabled", "إضافة دواء": "Add medication", "قائمة الأدوية": "Medication list", "خصوصية وتصدير": "Privacy & export", "قفل سريع داخل التطبيق": "In-app quick lock", "تقرير شخصي قابل للطباعة": "Printable personal summary", "تجهيز ملخص للطباعة": "Prepare summary for printing", "اتجاهاتكِ خلال آخر 14 متابعة": "Your trends from the last 14 entries", "التقويم الشهري": "Monthly calendar", "سجل الدورات": "Cycle history", "إضافة": "Add", "مساعد زُهيرة": "Zuhaira assistant", "إرشادات عامة تعمل دون اتصال": "General guidance available offline", "تسجيل الدخول": "Log in", "إنشاء حساب": "Create account", "البريد الإلكتروني": "Email address", "كلمة المرور (8 أحرف على الأقل)": "Password (at least 8 characters)", "الاسم الظاهر": "Display name", "إكمال الإعداد": "Complete setup", "إعادة المحاولة": "Try again", "إلغاء": "Cancel", "حذف السجل": "Delete record", "حذف المتابعة": "Delete entry", "تعديل": "Edit", "حفظ التعديل": "Save changes", "حفظ السجل": "Save record", "حفظ متابعة اليوم": "Save daily entry", "تفعيل": "Enable", "مفعّلة": "Enabled", "إيقاف": "Turn off", "جارٍ الحفظ...": "Saving...", "جارٍ المتابعة…": "Continuing…", "اليوم": "Today", "أيام الحيض": "Period days", "الخصوبة المتوقعة": "Predicted fertility", "متابعة المزاج والأعراض": "Mood & symptom tracking", "فاتح": "Light", "داكن": "Dark", "وردي": "Pink", "بنفسجي": "Purple", "يناير": "January", "فبراير": "February", "مارس": "March", "أبريل": "April", "مايو": "May", "يونيو": "June", "يوليو": "July", "أغسطس": "August", "سبتمبر": "September", "أكتوبر": "October", "نوفمبر": "November", "ديسمبر": "December", "الإثنين": "Monday", "الثلاثاء": "Tuesday", "الأربعاء": "Wednesday", "الخميس": "Thursday", "الجمعة": "Friday", "السبت": "Saturday", "الأحد": "Sunday"
};
const arabic = Object.fromEntries(Object.entries(english).map(([source, translated]) => [translated, source]));

function translateElement(root: Element, dictionary: Record<string, string>) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
  textNodes.forEach(node => { const value = node.nodeValue?.trim(); if (value && dictionary[value]) node.nodeValue = node.nodeValue?.replace(value, dictionary[value]) ?? null; });
  root.querySelectorAll<HTMLElement>("[placeholder],[aria-label],[title]").forEach(element => ["placeholder", "aria-label", "title"].forEach(attribute => { const value = element.getAttribute(attribute); if (value && dictionary[value]) element.setAttribute(attribute, dictionary[value]); }));
}

export function LanguageController({ language, onApplied }: { language: AppLanguage; onApplied?: () => void }) {
  useEffect(() => {
    const html = document.documentElement;
    const attributes = languageDocumentAttributes(language);
    html.lang = attributes.lang;
    html.dir = attributes.dir;
    html.dataset.language = language;
    const dictionary = language === "en" ? english : arabic;
    translateElement(document.body, dictionary);
    onApplied?.();
    if (language !== "en") return;
    const observer = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => { if (node instanceof Element) translateElement(node, english); })));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [language, onApplied]);
  return null;
}
