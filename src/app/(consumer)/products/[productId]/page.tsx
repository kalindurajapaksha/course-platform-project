import SkeletonButton from "@/components/Skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPublicProduct as getProduct } from "@/features/products/db/products";
import { getUserOwnsProduct } from "@/features/purchases/db/purchases";
import { formatPlural, formatPrice } from "@/lib/formatters";
import { sumArray } from "@/lib/sumArray";
import { getUserCoupon } from "@/lib/userCountryHeader";
import { getCurrentUser } from "@/services/clerk";
import { VideoIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const product = await getProduct(productId);
  if (product == null) return notFound();

  const courseCount = product.courses.length;

  const lessonCount = sumArray(product.courses, (course) =>
    sumArray(course.courseSections, (section) => section.lessons.length)
  );

  return (
    <div className="container my-6 ">
      <div className="flex flex-col-reverse sm:flex-row gap-10 sm:gap-16 items-center justify-between">
        <div className="flex gap-6 flex-col items-start sm:w-auto w-full ">
          <div className="flex flex-col gap-2">
            <Suspense
              fallback={
                <div className="text-xl">
                  {formatPrice(product.priceInDollars)}
                </div>
              }
            >
              <Price price={product.priceInDollars} />
            </Suspense>
            <h1 className="text-4xl font-semibold">{product.name}</h1>
            <div className="text-muted-foreground">
              {formatPlural(courseCount, {
                singular: "course",
                plural: "courses",
              })}{" "}
              •{" "}
              {formatPlural(lessonCount, {
                singular: "lesson",
                plural: "lessons",
              })}
            </div>
          </div>
          <div className="text-xl">{product.description}</div>
          <Suspense fallback={<SkeletonButton className="h-14 w-36" />}>
            <PurchaseButton productId={product.id} />
          </Suspense>
        </div>
        <div className="relative aspect-video max-w-lg w-full sm:w-auto flex-grow">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-contain rounded-xl"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8 items-start">
        {product.courses.map((course) => (
          <Card key={course.id}>
            <CardHeader>
              <CardTitle>{course.name}</CardTitle>
              <CardDescription>
                {formatPlural(course.courseSections.length, {
                  singular: "section",
                  plural: "sections",
                })}{" "}
                •{" "}
                {formatPlural(
                  sumArray(
                    course.courseSections,
                    (section) => section.lessons.length
                  ),
                  {
                    singular: "lesson",
                    plural: "lessons",
                  }
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple">
                {course.courseSections.map((section) => (
                  <AccordionItem key={section.id} value={section.id}>
                    <AccordionTrigger className="flex gap-2">
                      <div className="flex flex-col flex-grow">
                        <span className="text-lg">{section.name}</span>
                        <span className="text-muted-foreground">
                          {formatPlural(section.lessons.length, {
                            singular: "lesson",
                            plural: "lessons",
                          })}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="flex flex-col gap-2">
                      {section.lessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          className="flex items-center gap-2 text-base"
                        >
                          <VideoIcon className="size-4" />
                          {lesson.status === "preview" ? (
                            <Link
                              href={`/courses/${course.id}/lessons/${lesson.id}`}
                              className="underline text-accent"
                            >
                              {lesson.name}
                            </Link>
                          ) : (
                            lesson.name
                          )}
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

async function PurchaseButton({ productId }: { productId: string }) {
  const { userId } = await getCurrentUser();
  const alreadyOwnsProduct =
    userId != null && (await getUserOwnsProduct({ userId, productId }));
  if (alreadyOwnsProduct) {
    return <p>You already own this product</p>;
  } else {
    return (
      <Button
        className="text-xl h-auto py-4 px-8 rounded-lg sm:w-auto w-full"
        asChild
      >
        <Link href={`/products/${productId}/purchase`}>Get Now</Link>
      </Button>
    );
  }
}

async function Price({ price }: { price: number }) {
  const coupon = await getUserCoupon();
  if (price === 0 || coupon == null) return <div>{formatPrice(price)}</div>;
  return (
    <div className="flex gap-2 items-baseline">
      <div className="line-through text-sm opacity-50">
        {formatPrice(price)}
      </div>
      <div className="text-xl">
        {formatPrice(price * (1 - coupon.discountPercentage))}
      </div>
    </div>
  );
}
