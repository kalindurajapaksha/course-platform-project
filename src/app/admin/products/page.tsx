import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import ProductTable from "@/features/products/components/ProductTable";
import { getProductsForProductTable as getProducts } from "@/features/products/db/products";
import Link from "next/link";

export default async function ProductsPage() {
  const products = await getProducts();
  return (
    <div className="container my-6">
      <PageHeader title="Products">
        <Button asChild>
          <Link href="/admin/products/new">New Product</Link>
        </Button>
      </PageHeader>
      <ProductTable products={products} />
    </div>
  );
}
