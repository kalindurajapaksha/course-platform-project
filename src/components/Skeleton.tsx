import { cn } from "@/lib/utils";
import { buttonVariants } from "./ui/button";

export default function SkeletonButton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        buttonVariants({
          variant: "secondary",
          className: "pointer-events-none animate-pulse w-24",
        }),
        className
      )}
    />
  );
}
