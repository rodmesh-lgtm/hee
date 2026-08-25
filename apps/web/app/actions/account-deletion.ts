"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { getCurrentUserForWrites, logoutSession } from "../lib/auth";
import { isAdminEmail } from "../lib/admin";

const CONFIRMATION = "DELETE MY HEE ACCOUNT";
const DELETION_EVENT = "account_deletion_completed";
const SUPPORT_EVENT = "support_requested";

function metadataObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function deleteOwnAccountAction(formData: FormData) {
  const user = await getCurrentUserForWrites();
  if (!user) redirect("/login");

  if (!user.emailVerifiedAt) redirect("/dashboard/account-deletion?error=email-verification-required");
  if (isAdminEmail(user.email)) redirect("/dashboard/account-deletion?error=admin-protected");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const confirmation = String(formData.get("confirmation") ?? "").trim();
  if (email !== user.email.toLowerCase() || confirmation !== CONFIRMATION) {
    redirect("/dashboard/account-deletion?error=confirmation-mismatch");
  }

  const now = new Date();
  const deletionId = randomUUID();

  const result = await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`account-deletion:${user.id}`}))`;

    const current = await tx.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, emailVerifiedAt: true, deletedAt: true },
    });
    if (!current || current.deletedAt) return "already-deleted" as const;
    if (!current.emailVerifiedAt || current.email.toLowerCase() !== email) return "identity-changed" as const;

    const businesses = await tx.business.findMany({
      where: { ownerId: user.id, deletedAt: null },
      select: { id: true, slug: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    const businessIds = businesses.map((business) => business.id);

    for (const business of businesses) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`billing-business:${business.id}`}))`;
    }

    if (businessIds.length) {
      await tx.subscription.updateMany({
        where: { businessId: { in: businessIds }, autoRenew: true },
        data: { autoRenew: false },
      });
      await tx.billingPayment.updateMany({
        where: {
          businessId: { in: businessIds },
          kind: "renewal",
          status: { in: ["created", "failed"] },
        },
        data: { status: "canceled", nextRetryAt: null },
      });
      await tx.billingPaymentMethod.updateMany({
        where: { businessId: { in: businessIds }, status: "active" },
        data: { status: "revoked" },
      });
      await tx.subscriptionAccessGrant.updateMany({
        where: { businessId: { in: businessIds }, revokedAt: null },
        data: { revokedAt: now },
      });

      await tx.branch.updateMany({
        where: { businessId: { in: businessIds } },
        data: { isActive: false, city: null, district: null, address: null, phone: null, whatsapp: null, googleMapsLink: null },
      });
      await tx.contactPerson.updateMany({
        where: { businessId: { in: businessIds } },
        data: { isActive: false, jobTitle: null, phone: null, whatsapp: null, email: null, imageUrl: null },
      });
      await tx.socialLink.updateMany({
        where: { businessId: { in: businessIds } },
        data: { isActive: false, url: "about:blank" },
      });
      await tx.galleryItem.updateMany({
        where: { businessId: { in: businessIds } },
        data: { isActive: false, caption: null },
      });

      for (const business of businesses) {
        await tx.business.update({
          where: { id: business.id },
          data: {
            name: "Deleted business",
            nameEn: null,
            slug: `deleted-${business.id}`,
            description: null,
            shortDescription: null,
            entityType: null,
            businessCategory: null,
            onboardingCompleted: false,
            onboardingStep: "account_deleted",
            email: null,
            website: null,
            country: null,
            city: null,
            district: null,
            googleMapsLink: null,
            whatsapp: null,
            phone: null,
            address: null,
            logoUrl: null,
            coverUrl: null,
            pageModules: null,
            workingHours: null,
            deliveryAvailable: false,
            bookingAvailable: false,
            acceptOnlineOrders: false,
            xUrl: null,
            instagramUrl: null,
            snapchatUrl: null,
            tiktokUrl: null,
            facebookUrl: null,
            metaTitle: null,
            metaDescription: null,
            isVerified: false,
            isPublished: false,
            publishedAt: null,
            deletedAt: now,
            digitalDestinationType: null,
            companyProfileUrl: null,
            companyProfileTitle: null,
            licenseNumber: null,
          },
        });

        const audit = await tx.analyticsEvent.create({
          data: {
            businessId: business.id,
            eventType: DELETION_EVENT,
            metadata: {
              deletionId,
              userId: user.id,
              completedAt: now.toISOString(),
              priorSlug: business.slug,
              requesterProof: "authenticated_session+verified_email+exact_email+explicit_phrase",
              sessionsRevoked: true,
              publicationRevoked: true,
              renewalsStopped: true,
              paymentMethodsRevoked: true,
              accessGrantsRevoked: true,
              retainedRecordClasses: ["Customer", "Order", "OrderItem", "Booking", "Subscription", "BillingPayment", "BillingPaymentMethod", "BillingWebhookEvent", "LegalConsent", "AnalyticsEvent"],
              backupHandling: "production backups follow the documented retention schedule; restored data must preserve deletedAt and this audit event before service exposure",
            },
          },
          select: { id: true },
        });

        const openPrivacyTickets = await tx.analyticsEvent.findMany({
          where: { businessId: business.id, eventType: SUPPORT_EVENT },
          select: { id: true, metadata: true },
        });
        for (const ticket of openPrivacyTickets) {
          const metadata = metadataObject(ticket.metadata);
          if (metadata.status !== "open" || metadata.category !== "privacy" || metadata.requestedByUserId !== user.id) continue;
          await tx.analyticsEvent.update({
            where: { id: ticket.id },
            data: {
              metadata: {
                ...metadata,
                status: "resolved",
                privacyOutcome: "deletion_completed",
                deletionLifecycleEventId: audit.id,
                resolutionNote: "اكتملت دورة حذف الحساب وإلغاء النشر وإبطال الوصول والتجديدات ووسائل الدفع القابلة لإعادة الاستخدام. احتُفظ فقط بالسجلات التاريخية/المالية المشمولة بسياسة الاحتفاظ.",
                resolvedAt: now.toISOString(),
                resolvedByUserId: user.id,
                resolvedByEmail: "self-service-deletion",
              },
            },
          });
        }
      }
    }

    await tx.session.deleteMany({ where: { userId: user.id } });
    await tx.oAuthState.deleteMany({ where: { nonce: user.id } });
    await tx.authIdentity.updateMany({ where: { userId: user.id }, data: { providerEmail: null } });

    await tx.user.update({
      where: { id: user.id },
      data: {
        name: "Deleted account",
        email: `deleted+${user.id}@deleted.hee.invalid`,
        passwordHash: null,
        emailVerifiedAt: null,
        deletedAt: now,
      },
    });

    return "deleted" as const;
  });

  if (result === "identity-changed") redirect("/dashboard/account-deletion?error=identity-changed");
  await logoutSession();
  redirect("/login?account=deleted");
}

export const ACCOUNT_DELETION_CONFIRMATION = CONFIRMATION;
