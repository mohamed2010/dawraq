import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import Providers from "./providers";

const siteUrl = "https://dawraw.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "زُهيرة | متابعة الدورة بخصوصية",
    template: "%s | زُهيرة",
  },
  description: "زُهيرة تطبيق عربي خاص وآمن لمتابعة الدورة الشهرية والأعراض والخصوبة دون تشخيص طبي.",
  applicationName: "زُهيرة",
  generator: "Next.js",
  alternates: { canonical: "/" },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "ar_EG",
    url: siteUrl,
    siteName: "زُهيرة",
    title: "زُهيرة | متابعة الدورة بخصوصية",
    description: "مساحة عربية خاصة لمتابعة الدورة والأعراض والتوقعات التقديرية.",
  },
  twitter: {
    card: "summary",
    title: "زُهيرة | متابعة الدورة بخصوصية",
    description: "تتبّع خاص وهادئ للدورة والأعراض والخصوبة دون تشخيص طبي.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
};

export const viewport: Viewport = { themeColor: "#ed3f73", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get("x-csp-nonce") ?? undefined;
  return <html lang="ar" dir="rtl"><head><link nonce={nonce} rel="preconnect" href="https://fonts.googleapis.com" /><link nonce={nonce} rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" /><link nonce={nonce} href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet" /></head><body><Providers>{children}</Providers></body></html>;
}
