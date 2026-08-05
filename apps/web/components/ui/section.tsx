import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

type SectionProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
};

export function Section({ className, children, ...props }: SectionProps) {
  return (
    <section className={cn("py-16 md:py-20", className)} {...props}>
      {children}
    </section>
  );
}
