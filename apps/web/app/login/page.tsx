import { providerConfigured } from "../lib/oauth";
import { LoginClient } from "./login-content";

export default function LoginPage() {
  return <LoginClient googleEnabled={providerConfigured("google")} appleEnabled={providerConfigured("apple")} />;
}
