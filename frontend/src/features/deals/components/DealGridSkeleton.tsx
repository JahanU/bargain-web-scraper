import { Skeleton } from "@/shared/ui";

/** Ten placeholder cards at the real image ratio, so nothing shifts when deals arrive. */
export function DealGridSkeleton() {
  return (
    <ul
      aria-hidden
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4 xl:grid-cols-5"
    >
      {Array.from({ length: 10 }, (_, index) => (
        <li key={index} className="space-y-2">
          <Skeleton className="aspect-[726/926]" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-5 w-1/3" />
        </li>
      ))}
    </ul>
  );
}
