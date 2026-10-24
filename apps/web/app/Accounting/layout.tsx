import type { ReactNode } from "react";
import { OperationsShell } from "../../components/dashboard/operations-shell";
export default function AccountingLayout({ children }: { children: ReactNode }) {
  return <OperationsShell>{children}</OperationsShell>;
}
