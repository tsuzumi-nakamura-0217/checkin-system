import Image from "next/image"
import { redirect } from "next/navigation"

import { DashboardNavDesktop, DashboardNavMobile } from "@/components/dashboard-nav"
import { LogoutButton } from "@/components/logout-button"
import { getCurrentUser } from "@/lib/current-user"

type DashboardLayoutProps = {
  children: React.ReactNode
}

const navLinks = [
  { href: "/dashboard/overview", label: "ダッシュボード" },
  { href: "/dashboard/week", label: "カレンダー" },
  { href: "/dashboard/history", label: "履歴" },
  { href: "/dashboard/settings", label: "設定" },
]

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const currentUser = await getCurrentUser()

  if (!currentUser?.id) {
    redirect("/login")
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground selection:bg-primary">
      <div className="relative z-10 flex w-full lg:min-h-screen">
        <aside className="fixed top-0 left-0 z-40 hidden h-screen w-64 border-r border-border bg-sidebar px-5 py-8 lg:block">
          <div className="mb-5 rounded-2xl border border-border bg-card p-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">研究室</p>
                <p className="text-sm font-semibold tracking-tight">Dashboard</p>
              </div>
            </div>
            <LogoutButton className="mt-3 flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-border bg-background px-2.5 py-2 text-left transition-colors hover:bg-secondary">
              <div className="flex min-w-0 items-center gap-2">
                {currentUser.image ? (
                  <Image
                    src={currentUser.image}
                    alt="プロフィール画像"
                    width={28}
                    height={28}
                    className="h-7 w-7 rounded-full border border-border object-cover"
                  />
                ) : (
                  <div className="h-7 w-7 rounded-full border border-border bg-secondary" />
                )}
                <span className="truncate text-xs font-medium text-foreground">{currentUser.name || "ユーザー"}</span>
              </div>
              {currentUser.mode === "dev-bypass" ? (
                <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                  開発
                </span>
              ) : null}
            </LogoutButton>
          </div>
          <p className="mb-4 px-3 text-[0.65rem] font-semibold tracking-[0.2em] text-muted-foreground uppercase">Navigation</p>
          <DashboardNavDesktop navLinks={navLinks} />
        </aside>

        <main className="w-full px-4 pb-10 pt-5 sm:px-6 lg:ml-64 lg:flex-1 lg:px-8 lg:pt-6">
          <div className="mx-auto w-full max-w-330">
            <section className="mb-4 rounded-2xl border border-border bg-card p-3.5 shadow-sm lg:hidden">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">研究室</p>
                    <p className="text-sm font-semibold tracking-tight">Dashboard</p>
                  </div>
                </div>
                <LogoutButton className="h-8 w-8 cursor-pointer rounded-full overflow-hidden border border-border shadow-sm transition-transform hover:scale-105 active:scale-95">
                  {currentUser.image ? (
                    <Image
                      src={currentUser.image}
                      alt="プロフィール画像"
                      width={32}
                      height={32}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-secondary" />
                  )}
                </LogoutButton>
              </div>
            </section>

            <DashboardNavMobile navLinks={navLinks} />

            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
