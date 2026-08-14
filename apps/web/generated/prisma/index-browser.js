
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


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

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

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
  deletedAt: 'deletedAt',
  digitalDestinationType: 'digitalDestinationType',
  companyProfileUrl: 'companyProfileUrl',
  companyProfileTitle: 'companyProfileTitle',
  licenseNumber: 'licenseNumber'
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

exports.Prisma.BranchScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  name: 'name',
  city: 'city',
  district: 'district',
  address: 'address',
  phone: 'phone',
  whatsapp: 'whatsapp',
  googleMapsLink: 'googleMapsLink',
  isMain: 'isMain',
  isActive: 'isActive',
  sortOrder: 'sortOrder',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DepartmentScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  name: 'name',
  description: 'description',
  icon: 'icon',
  isActive: 'isActive',
  sortOrder: 'sortOrder',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ContactPersonScalarFieldEnum = {
  id: 'id',
  businessId: 'businessId',
  departmentId: 'departmentId',
  branchId: 'branchId',
  name: 'name',
  jobTitle: 'jobTitle',
  phone: 'phone',
  whatsapp: 'whatsapp',
  email: 'email',
  imageUrl: 'imageUrl',
  isPrimary: 'isPrimary',
  isActive: 'isActive',
  sortOrder: 'sortOrder',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
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
  StoredObject: 'StoredObject',
  Branch: 'Branch',
  Department: 'Department',
  ContactPerson: 'ContactPerson'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
