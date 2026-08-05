export function completionPercent(input: {
  name: string | null;
  businessType: string | null;
  shortDescription: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  phone: string | null;
  whatsapp: string | null;
  city: string | null;
  website: string | null;
}) {
  const checks = [
    Boolean(input.name),
    Boolean(input.businessType),
    Boolean(input.shortDescription),
    Boolean(input.logoUrl),
    Boolean(input.coverUrl),
    Boolean(input.phone),
    Boolean(input.whatsapp),
    Boolean(input.city),
    Boolean(input.website),
  ];

  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

export function buildDashboardSummary(input: {
  businessName: string;
  productsCount: number;
  servicesCount: number;
  ordersCount: number;
  customersCount: number;
  bookingsCount: number;
  analyticsCount: number;
  teamMembersCount: number;
}) {
  return {
    businessName: input.businessName,
    completionPercent: 100,
    teamMembersCount: input.teamMembersCount,
    metrics: [
      { label: "المنتجات", value: input.productsCount, accent: "from-cyan-500 to-sky-500" },
      { label: "الخدمات", value: input.servicesCount, accent: "from-violet-500 to-indigo-500" },
      { label: "الطلبات", value: input.ordersCount, accent: "from-emerald-500 to-lime-500" },
      { label: "العملاء", value: input.customersCount, accent: "from-amber-500 to-orange-500" },
    ],
    secondaryMetrics: [
      { label: "الحجوزات", value: input.bookingsCount },
      { label: "التتبع", value: input.analyticsCount },
      { label: "أعضاء الفريق", value: input.teamMembersCount },
    ],
  };
}
