import Image from "next/image";

type IrLogoProps = {
  className?: string;
  priority?: boolean;
};

/** Canonical iR mark supplied by the brand owner. Never crop or square it. */
export function IrLogo({ className = "h-12", priority = false }: IrLogoProps) {
  return (
    <Image
      src="/brand/ir-logo-original.webp"
      alt="iR"
      width={128}
      height={133}
      priority={priority}
      sizes="(max-width: 640px) 56px, 72px"
      className={`shrink-0 !w-auto object-contain ${className}`}
    />
  );
}
