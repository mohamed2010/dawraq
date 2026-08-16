import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "زُهيرة أونلاين",
  description: "متابعة خاصة وآمنة للدورة الشهرية والأعراض.",
  applicationName: "زُهيرة",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#ed3f73" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get("x-csp-nonce") ?? undefined;
  return <html lang="ar" dir="rtl"><head><link nonce={nonce} rel="preconnect" href="https://fonts.googleapis.com" /><link nonce={nonce} rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" /><link nonce={nonce} href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" /></head><body><Providers>{children}</Providers></body></html>;
}
