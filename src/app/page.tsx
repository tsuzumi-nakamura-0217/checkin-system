export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-20">
      <div className="relative z-10 w-full max-w-3xl rounded-3xl border border-border/70 bg-card/85 p-8 text-center shadow-xl shadow-primary/6 backdrop-blur sm:p-12">
        <p className="text-sm font-medium tracking-[0.18em] text-primary uppercase">Lab Checkin System</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          研究室チェックインを
          <br className="hidden sm:block" />
          もっとスマートに
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          出欠記録、タスク管理、週間の見える化をひとつに。毎日の研究リズムを、静かに整えるためのダッシュボードです。
        </p>
        <div className="mt-9 flex items-center justify-center">
          <a
            href="/login"
            className="rounded-full bg-primary px-9 py-3 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/30 transition-transform duration-200 hover:-translate-y-0.5 hover:opacity-95"
          >
            ログインして始める
          </a>
        </div>
      </div>
    </main>
  );
}
