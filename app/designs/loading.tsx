export default function DesignsLoading() {
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="h-10 w-64 bg-muted/20 rounded animate-pulse" />
            <div className="h-5 w-32 bg-muted/10 rounded animate-pulse mt-2" />
          </div>
          <div className="h-12 w-40 bg-muted/20 rounded animate-pulse" />
        </div>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="bg-surface rounded overflow-hidden shadow-lg border border-white/5"
            >
              <div className="aspect-square bg-muted/10 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-6 w-3/4 bg-muted/20 rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-muted/10 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

