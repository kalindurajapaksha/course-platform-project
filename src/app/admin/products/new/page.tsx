import PageHeader from "@/components/PageHeader";
import { getCoursesForProducts as getCourses } from "@/features/courses/db/courses";
import ProductForm from "@/features/products/components/ProductForm";

export default async function NewProductPage() {
  return (
    <div className="container my-6">
      <PageHeader title="New Course" />
      <ProductForm courses={await getCourses()} />
    </div>
  );
}
