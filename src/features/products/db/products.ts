import { db } from "@/drizzle/db";
import {
  CourseProductTable,
  ProductTable,
  PurchaseTable,
} from "@/drizzle/schema";
import { asc, countDistinct, eq } from "drizzle-orm";
import { cacheTag } from "next/dist/server/use-cache/cache-tag";
import {
  getProductGlobalTag,
  getProductIdTag,
  revalidateProductCache,
} from "./cache/products";

export async function getProductsForProductTable() {
  "use cache";
  cacheTag(getProductGlobalTag());
  return db
    .select({
      id: ProductTable.id,
      name: ProductTable.name,
      status: ProductTable.status,
      priceInDollars: ProductTable.priceInDollars,
      description: ProductTable.description,
      imageUrl: ProductTable.imageUrl,
      coursesCount: countDistinct(CourseProductTable.courseId),
      customersCount: countDistinct(PurchaseTable.userId),
    })
    .from(ProductTable)
    .leftJoin(PurchaseTable, eq(PurchaseTable.productId, ProductTable.id))
    .leftJoin(
      CourseProductTable,
      eq(CourseProductTable.productId, ProductTable.id)
    )
    .orderBy(asc(ProductTable.name))
    .groupBy(ProductTable.id);
}

export async function getProductForEdit(id: string) {
  "use cache";
  cacheTag(getProductIdTag(id));

  return db.query.ProductTable.findFirst({
    columns: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
      priceInDollars: true,
      status: true,
    },
    where: eq(ProductTable.id, id),
    with: {
      courseProducts: {
        columns: { courseId: true },
      },
    },
  });
}

export async function insertProduct(
  data: typeof ProductTable.$inferInsert & { courseIds: string[] }
) {
  const newProduct = await db.transaction(async (trx) => {
    const [newProduct] = await trx
      .insert(ProductTable)
      .values(data)
      .returning();
    if (newProduct == null) {
      trx.rollback();
      throw new Error("Failed to create product");
    }

    await trx.insert(CourseProductTable).values(
      data.courseIds.map((courseId) => ({
        courseId,
        productId: newProduct.id,
      }))
    );

    return newProduct;
  });

  revalidateProductCache(newProduct.id);

  return newProduct;
}

export async function updateProduct(
  id: string,
  data: typeof ProductTable.$inferInsert & { courseIds: string[] }
) {
  const updatedProduct = await db.transaction(async (trx) => {
    const [updatedProduct] = await trx
      .update(ProductTable)
      .set(data)
      .where(eq(ProductTable.id, id))
      .returning();

    if (updatedProduct == null) {
      trx.rollback();
      throw new Error("Failed to update product");
    }

    await trx
      .delete(CourseProductTable)
      .where(eq(CourseProductTable.productId, updatedProduct.id));

    await trx.insert(CourseProductTable).values(
      data.courseIds.map((courseId) => ({
        courseId,
        productId: updatedProduct.id,
      }))
    );

    return updatedProduct;
  });

  revalidateProductCache(updatedProduct.id);

  return updatedProduct;
}

export async function deleteProduct(id: string) {
  const [deletedProduct] = await db
    .delete(ProductTable)
    .where(eq(ProductTable.id, id))
    .returning();

  if (deletedProduct == null) throw new Error("Failed to delete product");

  revalidateProductCache(deletedProduct.id);

  return deletedProduct;
}
