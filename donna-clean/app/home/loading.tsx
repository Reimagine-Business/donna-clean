import { EntryListSkeleton } from "@/components/skeletons/entry-skeleton";

export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground pb-24 md:pb-8">
      <div className="flex-1 px-4 py-3 md:px-8">
        <div className="mx-auto w-full max-w-6xl space-y-3">
          <EntryListSkeleton />
        </div>
      </div>
    </div>
  );
}
