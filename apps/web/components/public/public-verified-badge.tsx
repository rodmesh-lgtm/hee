type PublicVerifiedBadgeProps = {
  size?: number;
};

export function PublicVerifiedBadge({ size = 20 }: PublicVerifiedBadgeProps) {
  return (
    <span aria-label="نشاط موثّق" role="img" className="inline-flex align-middle">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <title>موثق</title>
        <path
          d="M12 1.75 14.68 3.3l3.06-.45 1.55 2.68 2.68 1.55-.45 3.06L23.25 12l-1.73 2.86.45 3.06-2.68 1.55-1.55 2.68-3.06-.45L12 23.25l-2.86-1.73-3.06.45-1.55-2.68-2.68-1.55.45-3.06L.75 12l1.73-2.86-.45-3.06 2.68-1.55L6.26 2.85l3.06.45L12 1.75Z"
          fill="#006C35"
        />
        <path d="m8.1 12.2 2.35 2.35 5.4-5.35" stroke="white" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
