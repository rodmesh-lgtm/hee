import Image from "next/image";

type IrLogoProps = {
  className?: string;
  priority?: boolean;
};

export function IrLogo({ className = "h-12", priority = false }: IrLogoProps) {
  return (
    <Image
      src="/brand/ir-logo.png"
      alt="iR"
      width={1230}
      height={1278}
      priority={priority}
      sizes="(max-width: 640px) 56px, 72px"
      className={`shrink-0 !w-auto object-contain ${className}`}
    />
  );
}
