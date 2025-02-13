import PageHeader from "@/components/PageHeader";
import { getCoursesForProducts as getCourses } from "@/features/courses/db/courses";
import ProductForm from "@/features/products/components/ProductForm";
import { getProductForEdit as getProduct } from "@/features/products/db/products";
import { notFound } from "next/navigation";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const product = await getProduct(productId);

  if (product == null) return notFound();
  return (
    <div className="container my-6">
      <PageHeader title="Edit Product" />
      <ProductForm
        product={{
          ...product,
          courseIds: product.courseProducts.map(({ courseId }) => courseId),
        }}
        courses={await getCourses()}
      />
    </div>
  );
}
