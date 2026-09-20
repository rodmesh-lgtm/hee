import { Prisma } from "@prisma/client";

// Retry only transactions PostgreSQL has rolled back for serialization conflicts.
// The caller must keep external effects outside the retried transaction.
export async function retryBookingTransaction<T>(transaction: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await transaction();
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2034" || attempt >= 2) throw error;
      await new Promise(resolve => setTimeout(resolve, 25 * (attempt + 1)));
    }
  }
}
