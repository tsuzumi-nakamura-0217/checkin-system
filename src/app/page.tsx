import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/current-user"

export default async function Home() {
  const currentUser = await getCurrentUser()

  if (currentUser?.id) {
    redirect("/dashboard/overview")
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-20">
      <div className="relative z-10 w-full max-w-3xl rounded-[12px] bg-brand-house px-8 py-12 text-center shadow-[var(--shadow-nav)] sm:px-12 sm:py-16">
        <p className="text-sm font-medium tracking-[0.18em] text-white/70 uppercase">Lab Checkin System</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
          研究室チェックインを
          <br className="hidden sm:block" />
          もっとスマートに
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
          出欠記録、タスク管理、週間の見える化をひとつに。毎日の研究リズムを、静かに整えるためのダッシュボードです。
        </p>
        <div className="mt-9 flex items-center justify-center">
          <a
            href="/login"
            className="rounded-full bg-white px-9 py-3 text-sm font-semibold text-primary shadow-themed transition-all duration-200 hover:opacity-95 active:scale-[0.95]"
          >
            ログインして始める
          </a>
        </div>
      </div>
    </main>
  );
}
