export default function DashboardLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-themed sm:p-7">
        <div className="h-4 w-24 rounded-lg bg-secondary mb-3" />
        <div className="h-7 w-48 rounded-lg bg-secondary mb-2" />
        <div className="h-4 w-64 rounded-lg bg-secondary" />
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-secondary" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-3 w-16 rounded bg-secondary" />
                <div className="h-6 w-20 rounded bg-secondary" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-themed sm:p-7">
          <div className="h-5 w-32 rounded bg-secondary mb-4" />
          <div className="space-y-3">
            <div className="h-16 rounded-xl bg-secondary/60" />
            <div className="h-16 rounded-xl bg-secondary/60" />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-themed sm:p-7">
          <div className="h-5 w-28 rounded bg-secondary mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="h-2 w-2 rounded-full bg-secondary" />
                <div className="h-4 w-40 rounded bg-secondary" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
