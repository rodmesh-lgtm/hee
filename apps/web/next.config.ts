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

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1", "*.app.github.dev"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    serverActions: {
      // Explicitly include the canonical production hosts. Preview/dev hosts remain
      // available for RC validation without weakening origin checks globally.
      allowedOrigins: [
        "hee.sa",
        "www.hee.sa",
        "localhost:3000",
        "127.0.0.1:3000",
        "*.app.github.dev",
        "*.vercel.app",
      ],
      bodySizeLimit: "8mb",
    },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
