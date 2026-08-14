import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "زُهيرة أونلاين",
  description: "متابعة خاصة وآمنة للدورة الشهرية والأعراض.",
  applicationName: "زُهيرة",
};

export const viewport: Viewport = { themeColor: "#ed3f73" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body><Providers>{children}</Providers></body></html>;
}
