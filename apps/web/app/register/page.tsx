import { providerConfigured } from "../lib/oauth";
import { RegisterClient } from "./register-content";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return <RegisterClient googleEnabled={providerConfigured("google")} />;
}
