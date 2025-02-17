import { db } from "@/drizzle/db";
import { PurchaseTable } from "@/drizzle/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { cacheTag } from "next/dist/server/use-cache/cache-tag";
import {
  getPurchaseIdTag,
  getPurchaseUserTag,
  revalidatePurchaseCache,
} from "./cache/purchases";

export async function getUserOwnsProduct({
  userId,
  productId,
}: {
  userId: string;
  productId: string;
}) {
  "use cache";
  cacheTag(getPurchaseUserTag(userId));

  const existingPurchase = await db.query.PurchaseTable.findFirst({
    where: and(
      eq(PurchaseTable.userId, userId),
      eq(PurchaseTable.productId, productId),
      isNull(PurchaseTable.refundedAt)
    ),
  });

  return existingPurchase != null;
}

export async function getPurchase({
  userId,
  id,
}: {
  userId: string;
  id: string;
}) {
  "use cache";
  cacheTag(getPurchaseIdTag(id));

  return db.query.PurchaseTable.findFirst({
    columns: {
      pricePaidInCents: true,
      refundedAt: true,
      productDetails: true,
      createdAt: true,
      stripeSessionId: true,
    },
    where: and(eq(PurchaseTable.id, id), eq(PurchaseTable.userId, userId)),
  });
}

export async function getPurchases(userId: string) {
  "use cache";
  cacheTag(getPurchaseUserTag(userId));

  return db.query.PurchaseTable.findMany({
    columns: {
      id: true,
      productDetails: true,
      pricePaidInCents: true,
      refundedAt: true,
      createdAt: true,
    },
    where: eq(PurchaseTable.userId, userId),
    orderBy: desc(PurchaseTable.createdAt),
  });
}

export async function insertPurchase(
  data: typeof PurchaseTable.$inferInsert,
  trx: Omit<typeof db, "$client"> = db
) {
  const { name, description, imageUrl } = data.productDetails;
  const [newPurchase] = await trx
    .insert(PurchaseTable)
    .values({ ...data, productDetails: { name, description, imageUrl } })
    .onConflictDoNothing()
    .returning();

  if (newPurchase != null) revalidatePurchaseCache(newPurchase);

  return newPurchase;
}
