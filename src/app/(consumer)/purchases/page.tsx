import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  UserPurchaseTable,
  UserPurchaseTableSkeleton,
} from "@/features/purchases/components/UserPurchaseTable";
import { getPurchases } from "@/features/purchases/db/purchases";
import { getCurrentUser } from "@/services/clerk";
import Link from "next/link";
import { Suspense } from "react";

export default function PurchasePage() {
  return (
    <div className="container my-6">
      <PageHeader title="Purchase History" />
      <Suspense fallback={<UserPurchaseTableSkeleton />}>
        <SuspenseBoundary />
      </Suspense>
    </div>
  );
}

async function SuspenseBoundary() {
  const { userId, redirectToSignIn } = await getCurrentUser();

  if (userId == null) return redirectToSignIn();

  const purchases = await getPurchases(userId);

  if (purchases.length === 0) {
    return (
      <div className="flex flex-col gap-2 items-start">
        You have made no purchases yet
        <Button asChild size="lg">
          <Link href="/">Browse Courses</Link>
        </Button>
      </div>
    );
  }

  return <UserPurchaseTable purchases={purchases} />;
}
