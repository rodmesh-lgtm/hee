import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type AvatarProps = HTMLAttributes<HTMLDivElement> & {
  initials: string;
};

export function Avatar({ className, initials, ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-black text-white shadow-lg shadow-indigo-500/20",
        className,
      )}
      {...props}
    >
      {initials}
    </div>
  );
}
