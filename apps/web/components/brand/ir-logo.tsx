import Image from "next/image";

type IrLogoProps = {
  className?: string;
  priority?: boolean;
};

export function IrLogo({ className = "h-12 w-12", priority = false }: IrLogoProps) {
  return (
    <Image
      src="/brand/ir-logo.png"
      alt="iR"
      width={128}
      height={128}
      priority={priority}
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
