import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Dashboard previews intentionally frame the public HEE page on the same origin.
  // SAMEORIGIN keeps third-party framing blocked while allowing those previews to render.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

function serverActionOrigins() {
  const origins = ["hee.sa", "www.hee.sa"];
  if (process.env.VERCEL_ENV === "preview") origins.push("*.vercel.app");
  if (process.env.NODE_ENV !== "production") origins.push("localhost:3000", "127.0.0.1:3000", "*.app.github.dev");
  return origins;
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1", "*.app.github.dev"],
  // Do not configure a wildcard Next Image proxy. Current V10 customer media is
  // served by HEE's validated /api/storage endpoint or ordinary browser <img> tags.
  // Future external image providers must be allow-listed explicitly.
  experimental: {
    serverActions: {
      // Production accepts only canonical HEE origins. Preview/dev hosts are added
      // only in their own environments instead of being trusted by production.
      allowedOrigins: serverActionOrigins(),
      bodySizeLimit: "8mb",
    },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
