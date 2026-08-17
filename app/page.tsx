import { headers } from "next/headers";
import Home from "@/pages/Home";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "زُهيرة",
  alternateName: "زُهيرة لمتابعة الدورة",
  url: "https://dawraw.vercel.app/",
  applicationCategory: "HealthApplication",
  operatingSystem: "Web",
  inLanguage: "ar",
  isAccessibleForFree: true,
  description: "تطبيق عربي خاص وآمن لمتابعة الدورة الشهرية والأعراض والخصوبة دون تشخيص طبي.",
  publisher: { "@type": "Organization", name: "زُهيرة" },
};

export default async function Page() {
  const nonce = (await headers()).get("x-csp-nonce") ?? undefined;
  return <><script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /><Home /></>;
}
