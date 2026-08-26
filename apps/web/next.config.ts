import type { NextConfig } from "next";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  // Moyasar's PCI-scoped payment form is loaded from its documented CDN. Do not widen
  // this to arbitrary HTTPS script/style origins.
  "script-src 'self' 'unsafe-inline' https://cdn.moyasar.com",
  "style-src 'self' 'unsafe-inline' https://cdn.moyasar.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // Browser-side payment creation is performed by Moyasar Form against its API.
  // All other application API traffic remains same-origin.
  "connect-src 'self' https://api.moyasar.com wss:",
  "media-src 'self' blob: https:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Dashboard previews intentionally frame the public HEE page on the same origin.
  // SAMEORIGIN keeps third-party framing blocked while allowing those previews to render.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

function serverActionOrigins() {
  const origins = ["ir.sa", "www.ir.sa"];
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
      // Production accepts only canonical iR origins. Preview/dev hosts are added
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
