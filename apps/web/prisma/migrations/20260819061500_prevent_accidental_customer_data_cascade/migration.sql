-- Customer-data retention guardrail.
-- Once a user creates a HEE business/page, normal lifecycle operations must use
-- deletedAt, isPublished, isActive, or status changes. Physical deletion of the
-- parent User/Business must fail closed instead of cascading through customer data.
-- A future legally-authorized erasure workflow can still delete child records
-- deliberately and transactionally before removing the parent.

ALTER TABLE "Business" DROP CONSTRAINT IF EXISTS "Business_ownerId_fkey";
ALTER TABLE "Business" ADD CONSTRAINT "Business_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_businessId_fkey";
ALTER TABLE "Category" ADD CONSTRAINT "Category_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_businessId_fkey";
ALTER TABLE "Product" ADD CONSTRAINT "Product_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Customer" DROP CONSTRAINT IF EXISTS "Customer_businessId_fkey";
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_businessId_fkey";
ALTER TABLE "Order" ADD CONSTRAINT "Order_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Offer" DROP CONSTRAINT IF EXISTS "Offer_businessId_fkey";
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Service" DROP CONSTRAINT IF EXISTS "Service_businessId_fkey";
ALTER TABLE "Service" ADD CONSTRAINT "Service_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "Booking_businessId_fkey";
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkingHours" DROP CONSTRAINT IF EXISTS "WorkingHours_businessId_fkey";
ALTER TABLE "WorkingHours" ADD CONSTRAINT "WorkingHours_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GalleryItem" DROP CONSTRAINT IF EXISTS "GalleryItem_businessId_fkey";
ALTER TABLE "GalleryItem" ADD CONSTRAINT "GalleryItem_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SocialLink" DROP CONSTRAINT IF EXISTS "SocialLink_businessId_fkey";
ALTER TABLE "SocialLink" ADD CONSTRAINT "SocialLink_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Subscription" DROP CONSTRAINT IF EXISTS "Subscription_businessId_fkey";
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AnalyticsEvent" DROP CONSTRAINT IF EXISTS "AnalyticsEvent_businessId_fkey";
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Branch" DROP CONSTRAINT IF EXISTS "Branch_businessId_fkey";
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Department" DROP CONSTRAINT IF EXISTS "Department_businessId_fkey";
ALTER TABLE "Department" ADD CONSTRAINT "Department_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContactPerson" DROP CONSTRAINT IF EXISTS "ContactPerson_businessId_fkey";
ALTER TABLE "ContactPerson" ADD CONSTRAINT "ContactPerson_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Authentication sessions/identities keep their existing lifecycle semantics. A User
-- that owns retained Business data cannot be physically deleted because Business.ownerId
-- is now RESTRICT.
