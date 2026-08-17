import type { MetadataRoute } from "next";

const siteUrl = "https://dawraw.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/reset-password/", "/share/"] }],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
