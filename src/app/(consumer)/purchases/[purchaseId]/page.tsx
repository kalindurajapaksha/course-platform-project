import { LoadingSpinner } from "@/components/LoadingSpinner";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPurchase } from "@/features/purchases/db/purchases";
import { formatDate, formatPrice } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/services/clerk";
import { getStripeDetails } from "@/services/stripe/actions/stripe";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment, Suspense } from "react";

export default async function PurchasePage({
  params,
}: {
  params: Promise<{ purchaseId: string }>;
}) {
  const { purchaseId } = await params;

  return (
    <div className="container my-6">
      <Suspense fallback={<LoadingSpinner className="size-36 mx-auto" />}>
        <SuspenseBoundary purchaseId={purchaseId} />
      </Suspense>
    </div>
  );
}

async function SuspenseBoundary({ purchaseId }: { purchaseId: string }) {
  const { userId, redirectToSignIn, user } = await getCurrentUser({
    allData: true,
  });
  if (userId == null || user == null) return redirectToSignIn();

  const purchase = await getPurchase({ userId, id: purchaseId });

  if (purchase == null) return notFound();

  const { receiptUrl, pricingRows } = await getStripeDetails(
    purchase.stripeSessionId,
    purchase.pricePaidInCents,
    purchase.refundedAt != null
  );

  return (
    <>
      <PageHeader title={purchase.productDetails.name}>
        {receiptUrl && (
          <Button variant="outline" asChild>
            <Link target="_blank" href={receiptUrl}>
              View Receipt
            </Link>
          </Button>
        )}
      </PageHeader>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start gap-4">
            <div className="flex flex-col gap-1">
              <CardTitle>Receipt</CardTitle>
              <CardDescription>ID: {purchaseId}</CardDescription>
            </div>
            <Badge className="text-base">
              {purchase.refundedAt ? "Refunded" : "Paid"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pb-4 grid grid-cols-2 gap-8 border-t pt-4">
          <div>
            <label className="text-sm text-muted-foreground">Date</label>
            <div>{formatDate(purchase.createdAt)}</div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Product</label>
            <div>{purchase.productDetails.name}</div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Customer</label>
            <div>{user.name}</div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Seller</label>
            <div>KR Academy</div>
          </div>
        </CardContent>
        <CardFooter className="grid grid-cols-2 gap-y-4 gap-x-8 border-t pt-4">
          {pricingRows.map(({ label, amountInDollars, isBold }) => (
            <Fragment key={label}>
              <div className={cn(isBold && "font-bold")}>{label}</div>
              <div className={cn("justify-self-end", isBold && "font-bold")}>
                {formatPrice(amountInDollars, { showZeroAsNumber: true })}
              </div>
            </Fragment>
          ))}
        </CardFooter>
      </Card>
    </>
  );
}
