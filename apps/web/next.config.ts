import type { NextConfig } from "next";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  // Moyasar's PCI-scoped payment form is loaded from its documented CDN. Do not widen
  // this to arbitrary HTTPS script/style origins.
  "script-src 'self' 'unsafe-inline' https://cdn.moyasar.com https://connect.facebook.net https://eauthenticate.saudibusiness.gov.sa",
  "style-src 'self' 'unsafe-inline' https://cdn.moyasar.com https://eauthenticate.saudibusiness.gov.sa",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // Browser-side payment creation is performed by Moyasar Form against its API.
  // All other application API traffic remains same-origin.
  "connect-src 'self' https://api.moyasar.com https://www.facebook.com https://graph.facebook.com https://eauthenticate.saudibusiness.gov.sa wss:",
  "frame-src 'self' https://www.facebook.com https://business.facebook.com https://eauthenticate.saudibusiness.gov.sa",
  "media-src 'self' blob: https:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

const baseSecurityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Dashboard previews intentionally frame the public HEE page on the same origin.
  // SAMEORIGIN keeps third-party framing blocked while allowing those previews to render.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  // Meta Embedded Signup uses an authenticated cross-origin popup. This retains
  // opener communication for that flow without allowing this application to be framed.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const defaultPermissionsPolicy = "camera=(), microphone=(), geolocation=(), payment=()";
const businessNotesPermissionsPolicy = "camera=(), microphone=(self), geolocation=(), payment=()";

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
    return [
      {
        source: "/(.*)",
        headers: [...baseSecurityHeaders, { key: "Permissions-Policy", value: defaultPermissionsPolicy }],
      },
      {
        // Voice memos are intentionally the only browser surface allowed to request
        // microphone access. The more-specific rule overrides the global deny policy.
        source: "/dashboard/notes/:path*",
        headers: [{ key: "Permissions-Policy", value: businessNotesPermissionsPolicy }],
      },
    ];
  },
};

export default nextConfig;
