import { headers } from "next/headers";

export function getCanonicalPublicBaseUrl() {
  return "https://hee.sa";
}

export function getPublicBusinessUrl(slug: string) {
  return `${getCanonicalPublicBaseUrl()}/b/${slug}`;
}

export async function getPublicBusinessUrlFromRequest(slug: string) {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "hee.sa";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");

  if (host.includes("localhost") || host.includes("127.0.0.1") || host.includes("vercel.app")) {
    return `${protocol}://${host}/b/${slug}`;
  }

  return `${protocol}://${host}/b/${slug}`;
}
