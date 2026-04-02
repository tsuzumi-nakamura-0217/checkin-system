export default function DashboardLoading() {
  return (
    <div className="space-y-6 lg:space-y-8 animate-pulse">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-8 w-48 rounded-lg bg-secondary mb-2" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-secondary" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-3 w-16 rounded bg-secondary" />
                <div className="h-5 w-24 rounded bg-secondary" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="h-16 border-b border-border bg-secondary/50 px-6 py-4" />
        <div className="space-y-4 p-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-3 w-3 rounded-full bg-secondary" />
                <div className="h-4 w-32 rounded bg-secondary" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
