import { ACCOUNTING_SECURITY_HOLD } from "../lib/accounting-security";
import { AccountingSecurityNotice } from "./security-notice";
import type { ReactNode } from "react";
import { OperationsShell } from "../../components/dashboard/operations-shell";
export default function LaundryLayout({ children }: { children: ReactNode }) {
  if (ACCOUNTING_SECURITY_HOLD) return <AccountingSecurityNotice />;
  return <OperationsShell>{children}</OperationsShell>;
}
