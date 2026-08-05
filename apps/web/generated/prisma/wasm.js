
Object.defineProperty(exports, "__esModule", { value: true });

const {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
  PrismaClientInitializationError,
  PrismaClientValidationError,
  NotFoundError,
  getPrismaClient,
  sqltag,
  empty,
  join,
  raw,
  skip,
  Decimal,
  Debug,
  objectEnumValues,
  makeStrictEnum,
  Extensions,
  warnOnce,
  defineDmmfProperty,
  Public,
  getRuntime
} = require('./runtime/wasm.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = PrismaClientKnownRequestError;
Prisma.PrismaClientUnknownRequestError = PrismaClientUnknownRequestError
Prisma.PrismaClientRustPanicError = PrismaClientRustPanicError
Prisma.PrismaClientInitializationError = PrismaClientInitializationError
Prisma.PrismaClientValidationError = PrismaClientValidationError
Prisma.NotFoundError = NotFoundError
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = sqltag
Prisma.empty = empty
Prisma.join = join
Prisma.raw = raw
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = Extensions.getExtensionContext
Prisma.defineExtension = Extensions.defineExtension

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}





/**
 * Enums
 */
exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  passwordHash: 'passwordHash',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.SessionScalarFieldEnum = {
  id: 'id',
  token: 'token',
  userId: 'userId',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt'
};

exports.Prisma.BusinessPlanScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  monthlyPrice: 'monthlyPrice',
  productLimit: 'productLimit',
  aiEnabled: 'aiEnabled',
  onlinePay: 'onlinePay',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BusinessScalarFieldEnum = {
  id: 'id',
  ownerId: 'ownerId',
  planId: 'planId',
  name: 'name',
  nameEn: 'nameEn',
  slug: 'slug',
  businessType: 'businessType',
  description: 'description',
  shortDescription: 'shortDescription',
  entityType: 'entityType',
  businessCategory: 'businessCategory',
  onboardingCompleted: 'onboardingCompleted',
  onboardingStep: 'onboardingStep',
  email: 'email',
  website: 'website',
  country: 'country',
  city: 'city',
  district: 'district',
  googleMapsLink: 'googleMapsLink',
  whatsapp: 'whatsapp',
  phone: 'phone',
  address: 'address',
  logoUrl: 'logoUrl',
  coverUrl: 'coverUrl',
  primaryColor: 'primaryColor',
  secondaryColor: 'secondaryColor',
  buttonColor: 'buttonColor',
  buttonStyle: 'buttonStyle',
  cardStyle: 'cardStyle',
  pageModules: 'pageModules',
  workingHours: 'workingHours',
  deliveryAvailable: 'deliveryAvailable',
  bookingAvailable: 'bookingAvailable',
  acceptOnlineOrders: 'acceptOnlineOrders',
  xUrl: 'xUrl',
  instagramUrl: 'instagramUrl',
  snapchatUrl: 'snapchatUrl',
  tiktokUrl: 'tiktokUrl',
  facebookUrl: 'facebookUrl',
  metaTitle: 'metaTitle',
  metaDescription: 'metaDescription',
  isVerified: 'isVerified',
  isPublished: 'isPublished',
  publishedAt: 'publishedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.CategoryScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  name: 'name',
  sortOrder: 'sortOrder',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.ProductScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  categoryId: 'categoryId',
  name: 'name',
  description: 'description',
  unit: 'unit',
  price: 'price',
  oldPrice: 'oldPrice',
  imageUrl: 'imageUrl',
  isActive: 'isActive',
  featured: 'featured',
  sortOrder: 'sortOrder',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.CustomerScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  name: 'name',
  phone: 'phone',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrderScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  customerId: 'customerId',
  notes: 'notes',
  orderType: 'orderType',
  total: 'total',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrderItemScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  productId: 'productId',
  name: 'name',
  unitPrice: 'unitPrice',
  quantity: 'quantity',
  total: 'total',
  createdAt: 'createdAt'
};

exports.Prisma.OfferScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  title: 'title',
  description: 'description',
  discountLabel: 'discountLabel',
  imageUrl: 'imageUrl',
  startsAt: 'startsAt',
  endsAt: 'endsAt',
  isActive: 'isActive',
  sortOrder: 'sortOrder',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.ServiceScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  name: 'name',
  description: 'description',
  price: 'price',
  durationMinutes: 'durationMinutes',
  imageUrl: 'imageUrl',
  bookingEnabled: 'bookingEnabled',
  isActive: 'isActive',
  sortOrder: 'sortOrder',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.BookingScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  customerId: 'customerId',
  serviceId: 'serviceId',
  bookingDate: 'bookingDate',
  bookingTime: 'bookingTime',
  notes: 'notes',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WorkingHoursScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  dayOfWeek: 'dayOfWeek',
  opensAt: 'opensAt',
  closesAt: 'closesAt',
  secondOpensAt: 'secondOpensAt',
  secondClosesAt: 'secondClosesAt',
  isClosed: 'isClosed',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GalleryItemScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  imageUrl: 'imageUrl',
  caption: 'caption',
  sortOrder: 'sortOrder',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SocialLinkScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  platform: 'platform',
  url: 'url',
  sortOrder: 'sortOrder',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SubscriptionScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  planId: 'planId',
  status: 'status',
  provider: 'provider',
  providerCustomerId: 'providerCustomerId',
  providerSubscriptionId: 'providerSubscriptionId',
  startsAt: 'startsAt',
  endsAt: 'endsAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AnalyticsEventScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  eventType: 'eventType',
  path: 'path',
  referrer: 'referrer',
  userAgent: 'userAgent',
  country: 'country',
  city: 'city',
  metadata: 'metadata',
  createdAt: 'createdAt'
};

exports.Prisma.StoredObjectScalarFieldEnum = {
  id: 'id',
  objectKey: 'objectKey',
  folder: 'folder',
  fileName: 'fileName',
  mimeType: 'mimeType',
  size: 'size',
  data: 'data',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};


exports.Prisma.ModelName = {
  User: 'User',
  Session: 'Session',
  BusinessPlan: 'BusinessPlan',
  Business: 'Business',
  Category: 'Category',
  Product: 'Product',
  Customer: 'Customer',
  Order: 'Order',
  OrderItem: 'OrderItem',
  Offer: 'Offer',
  Service: 'Service',
  Booking: 'Booking',
  WorkingHours: 'WorkingHours',
  GalleryItem: 'GalleryItem',
  SocialLink: 'SocialLink',
  Subscription: 'Subscription',
  AnalyticsEvent: 'AnalyticsEvent',
  StoredObject: 'StoredObject'
};
/**
 * Create the Client
 */
const config = {
  "generator": {
    "name": "generated",
    "provider": {
      "fromEnvVar": null,
      "value": "prisma-client-js"
    },
    "output": {
      "value": "/workspaces/hee/apps/web/generated/prisma",
      "fromEnvVar": null
    },
    "config": {
      "engineType": "library"
    },
    "binaryTargets": [
      {
        "fromEnvVar": null,
        "value": "debian-openssl-1.1.x",
        "native": true
      }
    ],
    "previewFeatures": [
      "driverAdapters"
    ],
    "sourceFilePath": "/workspaces/hee/apps/web/prisma/schema.prisma",
    "isCustomOutput": true
  },
  "relativeEnvPaths": {
    "rootEnvPath": null
  },
  "relativePath": "../../prisma",
  "clientVersion": "5.22.0",
  "engineVersion": "605197351a3c8bdd595af2d2a9bc3025bca48ea2",
  "datasourceNames": [
    "db"
  ],
  "activeProvider": "postgresql",
  "postinstall": false,
  "inlineDatasources": {
    "db": {
      "url": {
        "fromEnvVar": "DATABASE_URL",
        "value": null
      }
    }
  },
  "inlineSchema": "generator client {\n  provider        = \"prisma-client-js\"\n  previewFeatures = [\"driverAdapters\"]\n}\n\ngenerator generated {\n  provider        = \"prisma-client-js\"\n  previewFeatures = [\"driverAdapters\"]\n  output          = \"../generated/prisma\"\n}\n\ndatasource db {\n  provider = \"postgresql\"\n  url      = env(\"DATABASE_URL\")\n}\n\nmodel User {\n  id           String    @id @default(uuid())\n  name         String\n  email        String    @unique\n  passwordHash String\n  createdAt    DateTime  @default(now())\n  updatedAt    DateTime  @updatedAt\n  deletedAt    DateTime?\n\n  sessions   Session[]\n  businesses Business[]\n\n  @@index([email])\n  @@index([deletedAt])\n}\n\nmodel Session {\n  id        String   @id @default(uuid())\n  token     String   @unique\n  userId    String\n  expiresAt DateTime\n  createdAt DateTime @default(now())\n\n  user User @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  @@index([userId])\n  @@index([expiresAt])\n}\n\nmodel BusinessPlan {\n  id           String   @id @default(uuid())\n  code         String   @unique\n  name         String\n  monthlyPrice Int\n  productLimit Int\n  aiEnabled    Boolean  @default(false)\n  onlinePay    Boolean  @default(false)\n  isActive     Boolean  @default(true)\n  createdAt    DateTime @default(now())\n  updatedAt    DateTime @updatedAt\n\n  businesses    Business[]\n  subscriptions Subscription[]\n}\n\nmodel Business {\n  id                  String    @id @default(uuid())\n  ownerId             String\n  planId              String?\n  name                String\n  nameEn              String?\n  slug                String    @unique\n  businessType        String\n  description         String?\n  shortDescription    String?\n  entityType          String?\n  businessCategory    String?\n  onboardingCompleted Boolean   @default(false)\n  onboardingStep      String?   @default(\"account_created\")\n  email               String?\n  website             String?\n  country             String?\n  city                String?\n  district            String?\n  googleMapsLink      String?\n  whatsapp            String?\n  phone               String?\n  address             String?\n  logoUrl             String?\n  coverUrl            String?\n  primaryColor        String    @default(\"#5D43EF\")\n  secondaryColor      String?\n  buttonColor         String?\n  buttonStyle         String?   @default(\"rounded\")\n  cardStyle           String?   @default(\"glass\")\n  pageModules         Json?\n  workingHours        String?\n  deliveryAvailable   Boolean   @default(false)\n  bookingAvailable    Boolean   @default(false)\n  acceptOnlineOrders  Boolean   @default(false)\n  xUrl                String?\n  instagramUrl        String?\n  snapchatUrl         String?\n  tiktokUrl           String?\n  facebookUrl         String?\n  metaTitle           String?\n  metaDescription     String?\n  isVerified          Boolean   @default(false)\n  isPublished         Boolean   @default(false)\n  publishedAt         DateTime?\n  createdAt           DateTime  @default(now())\n  updatedAt           DateTime  @updatedAt\n  deletedAt           DateTime?\n\n  owner         User             @relation(fields: [ownerId], references: [id], onDelete: Cascade)\n  plan          BusinessPlan?    @relation(fields: [planId], references: [id], onDelete: SetNull)\n  products      Product[]\n  categories    Category[]\n  offers        Offer[]\n  services      Service[]\n  customers     Customer[]\n  orders        Order[]\n  bookings      Booking[]\n  openingHours  WorkingHours[]\n  socialLinks   SocialLink[]\n  galleryItems  GalleryItem[]\n  subscriptions Subscription[]\n  analytics     AnalyticsEvent[]\n\n  @@index([ownerId])\n  @@index([planId])\n  @@index([slug])\n  @@index([isPublished])\n  @@index([deletedAt])\n}\n\nmodel Category {\n  id         String    @id @default(uuid())\n  businessId String\n  name       String\n  sortOrder  Int       @default(0)\n  isActive   Boolean   @default(true)\n  createdAt  DateTime  @default(now())\n  updatedAt  DateTime  @updatedAt\n  deletedAt  DateTime?\n\n  business Business  @relation(fields: [businessId], references: [id], onDelete: Cascade)\n  products Product[]\n\n  @@unique([businessId, name])\n  @@index([businessId])\n  @@index([sortOrder])\n}\n\nmodel Product {\n  id          String    @id @default(uuid())\n  businessId  String\n  categoryId  String?\n  name        String\n  description String?\n  unit        String?\n  price       Int\n  oldPrice    Int?\n  imageUrl    String?\n  isActive    Boolean   @default(true)\n  featured    Boolean   @default(false)\n  sortOrder   Int       @default(0)\n  createdAt   DateTime  @default(now())\n  updatedAt   DateTime  @updatedAt\n  deletedAt   DateTime?\n\n  business   Business    @relation(fields: [businessId], references: [id], onDelete: Cascade)\n  category   Category?   @relation(fields: [categoryId], references: [id], onDelete: SetNull)\n  orderItems OrderItem[]\n\n  @@index([businessId])\n  @@index([categoryId])\n  @@index([isActive])\n  @@index([sortOrder])\n}\n\nmodel Customer {\n  id         String   @id @default(uuid())\n  businessId String\n  name       String\n  phone      String\n  notes      String?\n  createdAt  DateTime @default(now())\n  updatedAt  DateTime @updatedAt\n\n  business Business  @relation(fields: [businessId], references: [id], onDelete: Cascade)\n  orders   Order[]\n  bookings Booking[]\n\n  @@index([businessId])\n  @@index([phone])\n}\n\nmodel Order {\n  id         String   @id @default(uuid())\n  businessId String\n  customerId String\n  notes      String?\n  orderType  String   @default(\"استلام\")\n  total      Int      @default(0)\n  status     String   @default(\"pending\")\n  createdAt  DateTime @default(now())\n  updatedAt  DateTime @updatedAt\n\n  business Business    @relation(fields: [businessId], references: [id], onDelete: Cascade)\n  customer Customer    @relation(fields: [customerId], references: [id], onDelete: Cascade)\n  items    OrderItem[]\n\n  @@index([businessId])\n  @@index([customerId])\n  @@index([status])\n  @@index([createdAt])\n}\n\nmodel OrderItem {\n  id        String   @id @default(uuid())\n  orderId   String\n  productId String?\n  name      String\n  unitPrice Int\n  quantity  Int      @default(1)\n  total     Int      @default(0)\n  createdAt DateTime @default(now())\n\n  order   Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)\n  product Product? @relation(fields: [productId], references: [id], onDelete: SetNull)\n\n  @@index([orderId])\n  @@index([productId])\n}\n\nmodel Offer {\n  id            String    @id @default(uuid())\n  businessId    String\n  title         String\n  description   String?\n  discountLabel String?\n  imageUrl      String?\n  startsAt      DateTime?\n  endsAt        DateTime?\n  isActive      Boolean   @default(true)\n  sortOrder     Int       @default(0)\n  createdAt     DateTime  @default(now())\n  updatedAt     DateTime  @updatedAt\n  deletedAt     DateTime?\n\n  business Business @relation(fields: [businessId], references: [id], onDelete: Cascade)\n\n  @@index([businessId])\n  @@index([isActive])\n  @@index([sortOrder])\n  @@index([startsAt, endsAt])\n}\n\nmodel Service {\n  id              String    @id @default(uuid())\n  businessId      String\n  name            String\n  description     String?\n  price           Int\n  durationMinutes Int?\n  imageUrl        String?\n  bookingEnabled  Boolean   @default(true)\n  isActive        Boolean   @default(true)\n  sortOrder       Int       @default(0)\n  createdAt       DateTime  @default(now())\n  updatedAt       DateTime  @updatedAt\n  deletedAt       DateTime?\n\n  business Business  @relation(fields: [businessId], references: [id], onDelete: Cascade)\n  bookings Booking[]\n\n  @@index([businessId])\n  @@index([isActive])\n  @@index([sortOrder])\n}\n\nmodel Booking {\n  id          String   @id @default(uuid())\n  businessId  String\n  customerId  String\n  serviceId   String?\n  bookingDate String\n  bookingTime String\n  notes       String?\n  status      String   @default(\"pending\")\n  createdAt   DateTime @default(now())\n  updatedAt   DateTime @updatedAt\n\n  business Business @relation(fields: [businessId], references: [id], onDelete: Cascade)\n  customer Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)\n  service  Service? @relation(fields: [serviceId], references: [id], onDelete: SetNull)\n\n  @@index([businessId])\n  @@index([customerId])\n  @@index([serviceId])\n  @@index([bookingDate])\n}\n\nmodel WorkingHours {\n  id             String   @id @default(uuid())\n  businessId     String\n  dayOfWeek      Int\n  opensAt        String?\n  closesAt       String?\n  secondOpensAt  String?\n  secondClosesAt String?\n  isClosed       Boolean  @default(false)\n  createdAt      DateTime @default(now())\n  updatedAt      DateTime @updatedAt\n\n  business Business @relation(fields: [businessId], references: [id], onDelete: Cascade)\n\n  @@unique([businessId, dayOfWeek])\n  @@index([businessId])\n  @@index([dayOfWeek])\n}\n\nmodel GalleryItem {\n  id         String   @id @default(uuid())\n  businessId String\n  imageUrl   String\n  caption    String?\n  sortOrder  Int      @default(0)\n  isActive   Boolean  @default(true)\n  createdAt  DateTime @default(now())\n  updatedAt  DateTime @updatedAt\n\n  business Business @relation(fields: [businessId], references: [id], onDelete: Cascade)\n\n  @@index([businessId])\n  @@index([sortOrder])\n  @@index([isActive])\n}\n\nmodel SocialLink {\n  id         String   @id @default(uuid())\n  businessId String\n  platform   String\n  url        String\n  sortOrder  Int      @default(0)\n  isActive   Boolean  @default(true)\n  createdAt  DateTime @default(now())\n  updatedAt  DateTime @updatedAt\n\n  business Business @relation(fields: [businessId], references: [id], onDelete: Cascade)\n\n  @@unique([businessId, platform])\n  @@index([businessId])\n  @@index([sortOrder])\n}\n\nmodel Subscription {\n  id                     String    @id @default(uuid())\n  businessId             String\n  planId                 String\n  status                 String    @default(\"active\")\n  provider               String?\n  providerCustomerId     String?\n  providerSubscriptionId String?\n  startsAt               DateTime  @default(now())\n  endsAt                 DateTime?\n  createdAt              DateTime  @default(now())\n  updatedAt              DateTime  @updatedAt\n\n  business Business     @relation(fields: [businessId], references: [id], onDelete: Cascade)\n  plan     BusinessPlan @relation(fields: [planId], references: [id], onDelete: Restrict)\n\n  @@index([businessId])\n  @@index([planId])\n  @@index([status])\n}\n\nmodel AnalyticsEvent {\n  id         String   @id @default(uuid())\n  businessId String\n  eventType  String\n  path       String?\n  referrer   String?\n  userAgent  String?\n  country    String?\n  city       String?\n  metadata   String?\n  createdAt  DateTime @default(now())\n\n  business Business @relation(fields: [businessId], references: [id], onDelete: Cascade)\n\n  @@index([businessId])\n  @@index([eventType])\n  @@index([createdAt])\n}\n\nmodel StoredObject {\n  id        String   @id @default(uuid())\n  objectKey String   @unique\n  folder    String\n  fileName  String\n  mimeType  String\n  size      Int\n  data      Bytes\n  createdAt DateTime @default(now())\n\n  @@index([folder])\n  @@index([createdAt])\n}\n",
  "inlineSchemaHash": "d28058541229a5ee6f68c8b3eb91067a0cc9c775cb4fa8bd05bb4f24430a6407",
  "copyEngine": true
}
config.dirname = '/'

config.runtimeDataModel = JSON.parse("{\"models\":{\"User\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"email\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"passwordHash\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"deletedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"sessions\",\"kind\":\"object\",\"type\":\"Session\",\"relationName\":\"SessionToUser\"},{\"name\":\"businesses\",\"kind\":\"object\",\"type\":\"Business\",\"relationName\":\"BusinessToUser\"}],\"dbName\":null},\"Session\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"token\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"expiresAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"SessionToUser\"}],\"dbName\":null},\"BusinessPlan\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"code\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"monthlyPrice\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"productLimit\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"aiEnabled\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"onlinePay\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"isActive\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"businesses\",\"kind\":\"object\",\"type\":\"Business\",\"relationName\":\"BusinessToBusinessPlan\"},{\"name\":\"subscriptions\",\"kind\":\"object\",\"type\":\"Subscription\",\"relationName\":\"BusinessPlanToSubscription\"}],\"dbName\":null},\"Business\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"ownerId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"planId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"nameEn\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"slug\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"businessType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"shortDescription\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"entityType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"businessCategory\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"onboardingCompleted\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"onboardingStep\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"email\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"website\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"country\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"city\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"district\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"googleMapsLink\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"whatsapp\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"phone\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"address\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"logoUrl\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"coverUrl\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"primaryColor\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"secondaryColor\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"buttonColor\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"buttonStyle\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"cardStyle\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"pageModules\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"workingHours\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"deliveryAvailable\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"bookingAvailable\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"acceptOnlineOrders\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"xUrl\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"instagramUrl\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"snapchatUrl\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"tiktokUrl\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"facebookUrl\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"metaTitle\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"metaDescription\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"isVerified\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"isPublished\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"publishedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"deletedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"owner\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"BusinessToUser\"},{\"name\":\"plan\",\"kind\":\"object\",\"type\":\"BusinessPlan\",\"relationName\":\"BusinessToBusinessPlan\"},{\"name\":\"products\",\"kind\":\"object\",\"type\":\"Product\",\"relationName\":\"BusinessToProduct\"},{\"name\":\"categories\",\"kind\":\"object\",\"type\":\"Category\",\"relationName\":\"BusinessToCategory\"},{\"name\":\"offers\",\"kind\":\"object\",\"type\":\"Offer\",\"relationName\":\"BusinessToOffer\"},{\"name\":\"services\",\"kind\":\"object\",\"type\":\"Service\",\"relationName\":\"BusinessToService\"},{\"name\":\"customers\",\"kind\":\"object\",\"type\":\"Customer\",\"relationName\":\"BusinessToCustomer\"},{\"name\":\"orders\",\"kind\":\"object\",\"type\":\"Order\",\"relationName\":\"BusinessToOrder\"},{\"name\":\"bookings\",\"kind\":\"object\",\"type\":\"Booking\",\"relationName\":\"BookingToBusiness\"},{\"name\":\"openingHours\",\"kind\":\"object\",\"type\":\"WorkingHours\",\"relationName\":\"BusinessToWorkingHours\"},{\"name\":\"socialLinks\",\"kind\":\"object\",\"type\":\"SocialLink\",\"relationName\":\"BusinessToSocialLink\"},{\"name\":\"galleryItems\",\"kind\":\"object\",\"type\":\"GalleryItem\",\"relationName\":\"BusinessToGalleryItem\"},{\"name\":\"subscriptions\",\"kind\":\"object\",\"type\":\"Subscription\",\"relationName\":\"BusinessToSubscription\"},{\"name\":\"analytics\",\"kind\":\"object\",\"type\":\"AnalyticsEvent\",\"relationName\":\"AnalyticsEventToBusiness\"}],\"dbName\":null},\"Category\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"businessId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sortOrder\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"isActive\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"deletedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"business\",\"kind\":\"object\",\"type\":\"Business\",\"relationName\":\"BusinessToCategory\"},{\"name\":\"products\",\"kind\":\"object\",\"type\":\"Product\",\"relationName\":\"CategoryToProduct\"}],\"dbName\":null},\"Product\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"businessId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"categoryId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"unit\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"price\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"oldPrice\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"imageUrl\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"isActive\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"featured\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"sortOrder\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"deletedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"business\",\"kind\":\"object\",\"type\":\"Business\",\"relationName\":\"BusinessToProduct\"},{\"name\":\"category\",\"kind\":\"object\",\"type\":\"Category\",\"relationName\":\"CategoryToProduct\"},{\"name\":\"orderItems\",\"kind\":\"object\",\"type\":\"OrderItem\",\"relationName\":\"OrderItemToProduct\"}],\"dbName\":null},\"Customer\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"businessId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"phone\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"notes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"business\",\"kind\":\"object\",\"type\":\"Business\",\"relationName\":\"BusinessToCustomer\"},{\"name\":\"orders\",\"kind\":\"object\",\"type\":\"Order\",\"relationName\":\"CustomerToOrder\"},{\"name\":\"bookings\",\"kind\":\"object\",\"type\":\"Booking\",\"relationName\":\"BookingToCustomer\"}],\"dbName\":null},\"Order\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"businessId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"customerId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"notes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"orderType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"total\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"business\",\"kind\":\"object\",\"type\":\"Business\",\"relationName\":\"BusinessToOrder\"},{\"name\":\"customer\",\"kind\":\"object\",\"type\":\"Customer\",\"relationName\":\"CustomerToOrder\"},{\"name\":\"items\",\"kind\":\"object\",\"type\":\"OrderItem\",\"relationName\":\"OrderToOrderItem\"}],\"dbName\":null},\"OrderItem\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"orderId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"productId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"unitPrice\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"quantity\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"total\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"order\",\"kind\":\"object\",\"type\":\"Order\",\"relationName\":\"OrderToOrderItem\"},{\"name\":\"product\",\"kind\":\"object\",\"type\":\"Product\",\"relationName\":\"OrderItemToProduct\"}],\"dbName\":null},\"Offer\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"businessId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"title\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"discountLabel\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"imageUrl\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"startsAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"endsAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"isActive\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"sortOrder\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"deletedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"business\",\"kind\":\"object\",\"type\":\"Business\",\"relationName\":\"BusinessToOffer\"}],\"dbName\":null},\"Service\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"businessId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"price\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"durationMinutes\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"imageUrl\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"bookingEnabled\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"isActive\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"sortOrder\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"deletedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"business\",\"kind\":\"object\",\"type\":\"Business\",\"relationName\":\"BusinessToService\"},{\"name\":\"bookings\",\"kind\":\"object\",\"type\":\"Booking\",\"relationName\":\"BookingToService\"}],\"dbName\":null},\"Booking\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"businessId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"customerId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"serviceId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"bookingDate\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"bookingTime\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"notes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"business\",\"kind\":\"object\",\"type\":\"Business\",\"relationName\":\"BookingToBusiness\"},{\"name\":\"customer\",\"kind\":\"object\",\"type\":\"Customer\",\"relationName\":\"BookingToCustomer\"},{\"name\":\"service\",\"kind\":\"object\",\"type\":\"Service\",\"relationName\":\"BookingToService\"}],\"dbName\":null},\"WorkingHours\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"businessId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"dayOfWeek\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"opensAt\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"closesAt\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"secondOpensAt\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"secondClosesAt\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"isClosed\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"business\",\"kind\":\"object\",\"type\":\"Business\",\"relationName\":\"BusinessToWorkingHours\"}],\"dbName\":null},\"GalleryItem\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"businessId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"imageUrl\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"caption\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sortOrder\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"isActive\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"business\",\"kind\":\"object\",\"type\":\"Business\",\"relationName\":\"BusinessToGalleryItem\"}],\"dbName\":null},\"SocialLink\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"businessId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"platform\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"url\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sortOrder\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"isActive\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"business\",\"kind\":\"object\",\"type\":\"Business\",\"relationName\":\"BusinessToSocialLink\"}],\"dbName\":null},\"Subscription\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"businessId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"planId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"provider\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"providerCustomerId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"providerSubscriptionId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"startsAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"endsAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"business\",\"kind\":\"object\",\"type\":\"Business\",\"relationName\":\"BusinessToSubscription\"},{\"name\":\"plan\",\"kind\":\"object\",\"type\":\"BusinessPlan\",\"relationName\":\"BusinessPlanToSubscription\"}],\"dbName\":null},\"AnalyticsEvent\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"businessId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"eventType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"path\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"referrer\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userAgent\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"country\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"city\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"metadata\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"business\",\"kind\":\"object\",\"type\":\"Business\",\"relationName\":\"AnalyticsEventToBusiness\"}],\"dbName\":null},\"StoredObject\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"objectKey\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"folder\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"fileName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"mimeType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"size\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"data\",\"kind\":\"scalar\",\"type\":\"Bytes\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null}},\"enums\":{},\"types\":{}}")
defineDmmfProperty(exports.Prisma, config.runtimeDataModel)
config.engineWasm = {
  getRuntime: () => require('./query_engine_bg.js'),
  getQueryEngineWasmModule: async () => {
    const loader = (await import('#wasm-engine-loader')).default
    const engine = (await loader).default
    return engine 
  }
}

config.injectableEdgeEnv = () => ({
  parsed: {
    DATABASE_URL: typeof globalThis !== 'undefined' && globalThis['DATABASE_URL'] || typeof process !== 'undefined' && process.env && process.env.DATABASE_URL || undefined
  }
})

if (typeof globalThis !== 'undefined' && globalThis['DEBUG'] || typeof process !== 'undefined' && process.env && process.env.DEBUG || undefined) {
  Debug.enable(typeof globalThis !== 'undefined' && globalThis['DEBUG'] || typeof process !== 'undefined' && process.env && process.env.DEBUG || undefined)
}

const PrismaClient = getPrismaClient(config)
exports.PrismaClient = PrismaClient
Object.assign(exports, Prisma)

