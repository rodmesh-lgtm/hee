import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard/",
          "/admin/",
          "/api/",
          "/preview",
          "/login",
          "/register",
          "/signup",
          "/onboarding",
          "/forgot-password",
          "/reset-password",
          "/qa/",
          "/demo/",
          "/hee-profile-concept",
          "/hee-v2-2026",
        ],
      },
    ],
    sitemap: "https://hee.sa/sitemap.xml",
    host: "https://hee.sa",
  };
}
