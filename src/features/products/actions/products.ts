"use server";

import { getCurrentUser } from "@/services/clerk";
import { productSchema } from "../schemas/products";
import {
  canCreateProducts,
  canDeleteProducts,
  canUpdateProducts,
} from "../permissions/products";
import { z } from "zod";
import { redirect } from "next/navigation";
import {
  insertProduct,
  updateProduct as updateProductDB,
  deleteProduct as deleteProductDB,
} from "../db/products";

export async function createProduct(unsafeData: z.infer<typeof productSchema>) {
  const { success, data } = productSchema.safeParse(unsafeData);
  if (!success || !canCreateProducts(await getCurrentUser())) {
    return { error: true, message: "There was an error creating your product" };
  }
  await insertProduct(data);
  redirect(`/admin/products`);
}

export async function updateProduct(
  id: string,
  unsafeData: z.infer<typeof productSchema>
) {
  const { success, data } = productSchema.safeParse(unsafeData);
  if (!success || !canUpdateProducts(await getCurrentUser())) {
    return { error: true, message: "There was an error creating your product" };
  }
  await updateProductDB(id, data);
  redirect(`/admin/products`);
}

export async function deleteProduct(id: string) {
  if (!canDeleteProducts(await getCurrentUser())) {
    return { error: true, message: "Error deleting your product" };
  }
  await deleteProductDB(id);
  return { error: false, message: "Successfully deleted your product" };
}
