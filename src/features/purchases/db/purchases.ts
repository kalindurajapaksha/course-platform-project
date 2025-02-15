import { db } from "@/drizzle/db";
import { PurchaseTable } from "@/drizzle/schema";
import { and, eq, isNull } from "drizzle-orm";
import { cacheTag } from "next/dist/server/use-cache/cache-tag";
import { getPurchaseUserTag } from "./cache/purchases";

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
