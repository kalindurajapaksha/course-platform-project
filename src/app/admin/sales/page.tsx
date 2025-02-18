import PageHeader from "@/components/PageHeader";
import { PurchaseTable } from "@/features/purchases/components/PurchaseTable";
import { getAllPurchases as getPurchases } from "@/features/purchases/db/purchases";

export default async function PurchasesPage() {
  const purchases = await getPurchases();
  return (
    <div className="container my-6">
      <PageHeader title="Sales" />
      <PurchaseTable purchases={purchases} />
    </div>
  );
}
