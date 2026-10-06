import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/current-user"

export default async function Home() {
  const currentUser = await getCurrentUser()

  if (currentUser?.id) {
    redirect("/dashboard/overview")
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-20">
      <div className="relative z-10 w-full max-w-3xl text-center animate-slide-up">
        <p className="text-[17px] font-semibold text-primary">Lab Check-in</p>
        <h1 className="mt-3 text-5xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-7xl">
          研究室の毎日を、
          <br />
          もっとスマートに。
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
          出欠記録、タスク管理、週間の見える化をひとつに。毎日の研究リズムを、静かに整えるためのダッシュボードです。
        </p>
        <div className="mt-10 flex items-center justify-center gap-6">
          <a
            href="/login"
            className="rounded-full bg-primary px-7 py-3 text-[17px] font-medium text-primary-foreground transition-colors duration-200 hover:bg-primary/90 active:opacity-80"
          >
            ログインして始める
          </a>
        </div>
      </div>
    </main>
  );
}
