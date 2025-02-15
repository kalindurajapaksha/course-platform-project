import ProductCard from "@/features/products/components/ProductCard";
import { getPublicProducts as getProducts } from "@/features/products/db/products";

export default async function HomePage() {
  const products = await getProducts();
  return (
    <div className="container my-6">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} {...product} />
        ))}
      </div>
    </div>
  );
}
