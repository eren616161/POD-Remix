export default function ProjectDetailLoading() {
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-muted/20 rounded animate-pulse" />
            <div>
              <div className="h-8 w-48 bg-muted/20 rounded animate-pulse" />
              <div className="h-4 w-32 bg-muted/10 rounded animate-pulse mt-2" />
            </div>
          </div>
          <div className="h-10 w-24 bg-muted/20 rounded animate-pulse" />
        </div>

        {/* Original Upload Skeleton */}
        <div className="mb-8 p-4 bg-surface rounded shadow-lg border border-white/5">
          <div className="h-4 w-28 bg-muted/10 rounded animate-pulse mb-3" />
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-muted/20 rounded animate-pulse" />
            <div className="h-4 w-64 bg-muted/10 rounded animate-pulse" />
          </div>
        </div>

        {/* Variants Grid Skeleton */}
        <div className="space-y-4">
          <div className="h-7 w-36 bg-muted/20 rounded animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-surface rounded overflow-hidden shadow-lg border border-white/5"
              >
                <div className="aspect-square bg-muted/10 animate-pulse" />
                <div className="p-4 flex items-center justify-between">
                  <div className="h-5 w-32 bg-muted/20 rounded animate-pulse" />
                  <div className="h-9 w-16 bg-muted/20 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

