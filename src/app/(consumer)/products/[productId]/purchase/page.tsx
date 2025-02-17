import { LoadingSpinner } from "@/components/LoadingSpinner";
import PageHeader from "@/components/PageHeader";
import { getPublicProductForPurchase as getPublicProduct } from "@/features/products/db/products";
import { getUserOwnsProduct } from "@/features/purchases/db/purchases";
import { getCurrentUser } from "@/services/clerk";
import StripeCheckoutForm from "@/services/stripe/components/StripeCheckoutForm";
import { SignIn, SignUp } from "@clerk/nextjs";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

export default function PurchasePage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ authMode: string }>;
}) {
  return (
    <Suspense fallback={<LoadingSpinner className="my-6 size-36 mx-auto" />}>
      <SuspendedComponent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function SuspendedComponent({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ authMode: string }>;
}) {
  const { productId } = await params;
  const { user } = await getCurrentUser({ allData: true });
  const product = await getPublicProduct(productId);

  if (product == null) return notFound();

  if (user != null) {
    if (await getUserOwnsProduct({ userId: user.id, productId })) {
      redirect("/courses");
    }
    return (
      <div className="container my-6">
        <StripeCheckoutForm product={product} user={user} />
      </div>
    );
  }

  const { authMode } = await searchParams;
  const isSignUp = authMode === "signUp";

  return (
    <div className="container my-6 flex flex-col items-center">
      <PageHeader title="You need an account to make a purchase" />
      {isSignUp ? (
        <SignUp
          routing="hash"
          signInUrl={`/products/${productId}/purchase?authMode=signIn`}
          forceRedirectUrl={`/products/${productId}/purchase`}
        />
      ) : (
        <SignIn
          routing="hash"
          signUpUrl={`/products/${productId}/purchase?authMode=signUp`}
          forceRedirectUrl={`/products/${productId}/purchase`}
        />
      )}
    </div>
  );
}
