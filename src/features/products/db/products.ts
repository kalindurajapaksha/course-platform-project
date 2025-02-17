import { db } from "@/drizzle/db";
import {
  CourseProductTable,
  CourseSectionTable,
  LessonTable,
  ProductTable,
  PurchaseTable,
} from "@/drizzle/schema";
import { and, asc, countDistinct, eq } from "drizzle-orm";
import { cacheTag } from "next/dist/server/use-cache/cache-tag";
import {
  getProductGlobalTag,
  getProductIdTag,
  revalidateProductCache,
} from "./cache/products";
import { wherePublicCourseSections } from "@/features/courseSections/db/sections";
import { wherePublicLessons } from "@/features/lessons/db/lessons";
import { getLessonCourseTag } from "@/features/lessons/db/cache/lessons";
import { getCourseSectionCourseTag } from "@/features/courseSections/db/cache/courseSections";
import { getCourseIdTag } from "@/features/courses/db/cache/courses";

export const wherePublicProducts = eq(ProductTable.status, "public");

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

export async function getPublicProducts() {
  "use cache";
  cacheTag(getProductGlobalTag());
  return db.query.ProductTable.findMany({
    columns: {
      id: true,
      name: true,
      description: true,
      priceInDollars: true,
      imageUrl: true,
    },
    where: wherePublicProducts,
    orderBy: asc(ProductTable.name),
  });
}

export async function getPublicProduct(id: string) {
  "use cache";
  cacheTag(getProductIdTag(id));
  const product = await db.query.ProductTable.findFirst({
    columns: {
      id: true,
      name: true,
      description: true,
      priceInDollars: true,
      imageUrl: true,
    },
    where: and(eq(ProductTable.id, id), wherePublicProducts),
    with: {
      courseProducts: {
        with: {
          course: {
            columns: {
              id: true,
              name: true,
            },
            with: {
              courseSections: {
                columns: { id: true, name: true },
                where: wherePublicCourseSections,
                orderBy: asc(CourseSectionTable.order),
                with: {
                  lessons: {
                    columns: { id: true, name: true, status: true },
                    where: wherePublicLessons,
                    orderBy: asc(LessonTable.order),
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (product == null) return product;

  cacheTag(
    ...product.courseProducts.flatMap((cp) => [
      getLessonCourseTag(cp.course.id),
      getCourseSectionCourseTag(cp.course.id),
      getCourseIdTag(cp.course.id),
    ])
  );

  const { courseProducts, ...rest } = product;
  return {
    ...rest,
    courses: courseProducts.map((cp) => cp.course),
  };
}

export async function getPublicProductForPurchase(id: string) {
  "use cache";
  cacheTag(getProductIdTag(id));
  return db.query.ProductTable.findFirst({
    columns: {
      id: true,
      name: true,
      description: true,
      priceInDollars: true,
      imageUrl: true,
    },
    where: and(eq(ProductTable.id, id), wherePublicProducts),
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
