import { getCurrentUser } from "../../lib/auth";
import { db } from "../../lib/db";
import { ProductsBoard } from "../../../components/shared/products-board";

export default async function DashboardProductsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const business = await db.business.findFirst({ where: { ownerId: user.id } });
  const products = business ? await db.product.findMany({ where: { businessId: business.id } }) : [];

  return <ProductsBoard business={business} products={products} />;
}
