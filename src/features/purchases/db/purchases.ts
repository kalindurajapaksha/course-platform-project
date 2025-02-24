import { db } from "@/drizzle/db";
import { PurchaseTable } from "@/drizzle/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { cacheTag } from "next/dist/server/use-cache/cache-tag";
import {
  getPurchaseGlobalTag,
  getPurchaseIdTag,
  getPurchaseUserTag,
  revalidatePurchaseCache,
} from "./cache/purchases";
import { getUserGlobalTag } from "@/features/users/db/cache";

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

export async function getAllPurchases() {
  "use cache";
  cacheTag(getPurchaseGlobalTag(), getUserGlobalTag());
  return db.query.PurchaseTable.findMany({
    columns: {
      id: true,
      productDetails: true,
      pricePaidInCents: true,
      refundedAt: true,
      createdAt: true,
    },
    with: { user: { columns: { name: true } } },
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

export async function updatePurchase(
  id: string,
  data: Partial<typeof PurchaseTable.$inferInsert>,
  trx: Omit<typeof db, "$client"> = db
) {
  const details = data.productDetails;
  const [updatedPurchase] = await trx
    .update(PurchaseTable)
    .set({
      ...data,
      productDetails: details
        ? {
            name: details.name,
            description: details.description,
            imageUrl: details.imageUrl,
          }
        : undefined,
    })
    .where(eq(PurchaseTable.id, id))
    .returning();

  if (updatedPurchase == null) throw new Error("Failed to update purchase");

  revalidatePurchaseCache(updatedPurchase);

  return updatedPurchase;
}
