import { providerConfigured } from "../lib/oauth";
import { LoginClient } from "./login-content";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return <LoginClient googleEnabled={providerConfigured("google")} appleEnabled={providerConfigured("apple")} />;
}
