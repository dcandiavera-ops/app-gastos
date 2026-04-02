function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-surface-variant ${className}`}></div>;
}

export function DashboardLoadingSkeleton() {
  return (
    <main className="pt-28 pb-32 px-6 max-w-7xl mx-auto space-y-8">
      <section className="supabase-card p-10 space-y-6">
        <SkeletonBlock className="h-6 w-40 mx-auto rounded-full" />
        <div className="space-y-4 flex flex-col items-center">
          <SkeletonBlock className="h-5 w-32" />
          <SkeletonBlock className="h-20 w-48" />
          <SkeletonBlock className="h-10 w-80 rounded-full" />
        </div>
        <SkeletonBlock className="h-3 w-full max-w-md mx-auto rounded-full" />
        <SkeletonBlock className="h-14 w-full max-w-lg mx-auto" />
        <div className="grid md:grid-cols-3 gap-4">
          <SkeletonBlock className="h-20 w-full" />
          <SkeletonBlock className="h-20 w-full" />
          <SkeletonBlock className="h-20 w-full" />
        </div>
      </section>

      <section className="supabase-card p-6 md:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <SkeletonBlock className="h-8 w-64" />
          <SkeletonBlock className="h-10 w-32 rounded-md" />
        </div>
        <SkeletonBlock className="h-16 w-full" />
        <SkeletonBlock className="h-16 w-full" />
        <SkeletonBlock className="h-16 w-full" />
      </section>
    </main>
  );
}

export function HistoryLoadingSkeleton() {
  return (
    <main className="pt-24 px-6 max-w-2xl mx-auto pb-32 space-y-8">
      <div className="flex justify-between items-center mt-2">
        <SkeletonBlock className="h-10 w-48" />
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-10 w-32 rounded-md" />
          <SkeletonBlock className="h-10 w-10 rounded-md" />
        </div>
      </div>

      <div className="space-y-4">
        <SkeletonBlock className="h-4 w-44" />
        <SkeletonBlock className="h-20 w-full" />
        <SkeletonBlock className="h-20 w-full" />
        <SkeletonBlock className="h-4 w-52" />
        <SkeletonBlock className="h-20 w-full" />
      </div>
    </main>
  );
}

export function BudgetLoadingSkeleton() {
  return (
    <main className="pt-24 px-6 max-w-2xl mx-auto pb-32 space-y-8">
      <div className="flex justify-between items-center mb-6">
        <SkeletonBlock className="h-10 w-64" />
        <SkeletonBlock className="h-10 w-28" />
      </div>
      <section className="supabase-card p-8 space-y-6">
        <SkeletonBlock className="h-8 w-64" />
        <div className="grid sm:grid-cols-3 gap-4">
          <SkeletonBlock className="h-20 w-full" />
          <SkeletonBlock className="h-20 w-full" />
          <SkeletonBlock className="h-20 w-full" />
        </div>
      </section>
      <section className="supabase-card p-6 space-y-4">
        <SkeletonBlock className="h-8 w-56" />
        <SkeletonBlock className="h-16 w-full" />
        <SkeletonBlock className="h-16 w-full" />
        <SkeletonBlock className="h-16 w-full" />
      </section>
    </main>
  );
}

export function EntryLoadingSkeleton() {
  return (
    <main className="pt-24 px-6 max-w-lg mx-auto pb-32 space-y-8">
      <section className="mb-10 text-center space-y-4">
        <SkeletonBlock className="h-4 w-24 mx-auto" />
        <SkeletonBlock className="h-20 w-full" />
      </section>
      <div className="space-y-6 mb-8">
        <SkeletonBlock className="h-12 w-full r" />
        <div className="flex justify-center gap-3">
          <SkeletonBlock className="h-10 w-32 rounded-md" />
          <SkeletonBlock className="h-10 w-32 rounded-md" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-10">
        <SkeletonBlock className="h-24 w-full" />
        <SkeletonBlock className="h-24 w-full" />
        <SkeletonBlock className="h-24 w-full" />
        <SkeletonBlock className="h-24 w-full" />
        <SkeletonBlock className="h-24 w-full" />
        <SkeletonBlock className="h-24 w-full" />
      </div>
      <SkeletonBlock className="h-12 w-full" />
    </main>
  );
}

export function ScanLoadingSkeleton() {
  return (
    <main className="min-h-screen w-full pt-24 pb-32 px-6 space-y-8">
      <div className="space-y-3">
        <SkeletonBlock className="h-10 w-44" />
        <SkeletonBlock className="h-4 w-96 max-w-full" />
      </div>
      <SkeletonBlock className="h-[360px] w-full rounded-2xl" />
      <section className="supabase-card p-5 space-y-4">
        <SkeletonBlock className="h-6 w-56" />
        <SkeletonBlock className="h-64 w-full" />
        <SkeletonBlock className="h-12 w-full" />
      </section>
    </main>
  );
}
