CREATE TABLE "LaundryDelivery" (
 id TEXT PRIMARY KEY,"businessId" TEXT NOT NULL,"ticketId" TEXT NOT NULL,"driverId" TEXT NOT NULL,
 "customerName" TEXT NOT NULL,phone TEXT NOT NULL,address TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'assigned' CHECK(status IN ('assigned','out_for_delivery','delivered','failed')),
 recipient TEXT NOT NULL DEFAULT '',"consentRecordedBy" TEXT NOT NULL,"consentRecordedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE("businessId",id),UNIQUE("businessId","ticketId"),
 FOREIGN KEY("businessId","ticketId") REFERENCES "LaundryTicket"("businessId",id) ON DELETE RESTRICT,
 FOREIGN KEY("businessId","driverId") REFERENCES "BusinessMember"("businessId","userId") ON DELETE RESTRICT
);
CREATE TABLE "LaundryDeliveryEvent" (
 id TEXT PRIMARY KEY,"businessId" TEXT NOT NULL,"deliveryId" TEXT NOT NULL,"requestId" TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('assigned','out_for_delivery','delivered','failed')),
 note TEXT NOT NULL,"actorId" TEXT NOT NULL,"createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE("businessId","requestId"),
 FOREIGN KEY("businessId","deliveryId") REFERENCES "LaundryDelivery"("businessId",id) ON DELETE RESTRICT
);
CREATE INDEX "LaundryDelivery_driver" ON "LaundryDelivery"("businessId","driverId",status,"createdAt");
CREATE FUNCTION reject_laundry_delivery_event_update() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'LAUNDRY_DELIVERY_EVENT_IMMUTABLE'; END $$;
CREATE TRIGGER laundry_delivery_event_immutable BEFORE UPDATE ON "LaundryDeliveryEvent" FOR EACH ROW EXECUTE FUNCTION reject_laundry_delivery_event_update();
