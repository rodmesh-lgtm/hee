export type PublicProduct = {
  id: string;
  name: string;
  description: string | null;
  unit: string | null;
  price: number;
  oldPrice: number | null;
  imageUrl: string | null;
  isActive: boolean;
  categoryName: string | null;
};

export type PublicOffer = {
  id: string;
  title: string;
  description: string | null;
  discountLabel: string | null;
  imageUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
};

export type PublicService = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  durationMinutes: number | null;
  imageUrl: string | null;
  bookingEnabled: boolean;
  sortOrder: number;
};

export type PublicWorkingHour = {
  id: string;
  dayOfWeek: number;
  opensAt: string | null;
  closesAt: string | null;
  secondOpensAt: string | null;
  secondClosesAt: string | null;
  isClosed: boolean;
};

export type PublicSocialLink = {
  id: string;
  platform: string;
  url: string;
};

export type PublicGalleryItem = {
  id: string;
  imageUrl: string;
  caption: string | null;
  sortOrder: number;
};

export type PublicBusinessData = {
  id: string;
  slug: string;
  name: string;
  businessType: string;
  description: string | null;
  isVerified: boolean;
  primaryColor: string;
  secondaryColor: string | null;
  buttonStyle: string | null;
  cardStyle: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  city: string | null;
  district: string | null;
  address: string | null;
  establishedYear: number | null;
  workingHours: string | null;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  googleMapsLink: string | null;
  bookingAvailable: boolean;
  acceptOnlineOrders: boolean;
  xUrl: string | null;
  instagramUrl: string | null;
  snapchatUrl: string | null;
  tiktokUrl: string | null;
  facebookUrl: string | null;
  products: PublicProduct[];
  offers: PublicOffer[];
  services: PublicService[];
  galleryItems: PublicGalleryItem[];
  openingHours: PublicWorkingHour[];
  socialLinks: PublicSocialLink[];
};
