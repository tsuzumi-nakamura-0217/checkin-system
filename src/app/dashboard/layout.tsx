import Image from "next/image"
import { redirect } from "next/navigation"

import { DashboardNavDesktop, DashboardNavMobile } from "@/components/dashboard-nav"
import { LogoutButton } from "@/components/logout-button"
import { getCurrentUser } from "@/lib/current-user"

type DashboardLayoutProps = {
  children: React.ReactNode
}

const navLinks = [
  { href: "/dashboard/overview", label: "ダッシュボード", icon: "dashboard" },
  { href: "/dashboard/week", label: "カレンダー", icon: "calendar" },
  { href: "/dashboard/tasks", label: "タスク", icon: "tasks" },
  { href: "/dashboard/history", label: "履歴", icon: "history" },
  { href: "/dashboard/settings", label: "設定", icon: "settings" },
]

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const currentUser = await getCurrentUser()

  if (!currentUser?.id) {
    redirect("/login")
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground selection:bg-primary/20">
      <div className="relative z-10 flex w-full lg:min-h-screen">
        {/* Desktop Sidebar */}
        <aside className="fixed top-0 left-0 z-40 hidden h-screen w-[260px] border-r border-sidebar-border bg-sidebar px-5 py-6 lg:flex lg:flex-col">
          {/* Brand */}
          <div className="mb-6 rounded-2xl border border-border bg-card p-3.5 shadow-themed">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary text-white shadow-sm">
                <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-[0.2em] text-primary/60 uppercase">研究室</p>
                <p className="text-sm font-bold tracking-tight text-foreground">Dashboard</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <p className="mb-3 px-3 text-[10px] font-bold tracking-[0.2em] text-muted-foreground/60 uppercase">Menu</p>
          <DashboardNavDesktop navLinks={navLinks} />

          {/* User Card (bottom) */}
          <div className="mt-auto pt-4">
            <LogoutButton className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-all hover:shadow-themed hover:border-primary/20 active:scale-[0.98]">
              <div className="relative">
                {currentUser.image ? (
                  <Image
                    src={currentUser.image}
                    alt="プロフィール画像"
                    width={36}
                    height={36}
                    className="h-9 w-9 rounded-xl border-2 border-primary/20 object-cover"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-xl border-2 border-primary/20 bg-primary/10 flex items-center justify-center">
                    <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{currentUser.name || "ユーザー"}</p>
                <p className="text-[11px] text-muted-foreground">ログアウト</p>
              </div>
              {currentUser.mode === "dev-bypass" ? (
                <span className="rounded-full gradient-primary px-2 py-0.5 text-[10px] font-bold text-white">
                  DEV
                </span>
              ) : null}
            </LogoutButton>
          </div>
        </aside>

        {/* Main Content */}
        <main className="w-full px-4 pb-24 pt-5 sm:px-6 lg:ml-[260px] lg:flex-1 lg:px-8 lg:pt-6 lg:pb-10">
          <div className="mx-auto w-full max-w-330">
            {/* Mobile Header */}
            <section className="mb-4 rounded-2xl border border-border bg-card p-3.5 shadow-themed lg:hidden">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary text-white shadow-sm">
                    <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.2em] text-primary/60 uppercase">研究室</p>
                    <p className="text-sm font-bold tracking-tight">Dashboard</p>
                  </div>
                </div>
                <LogoutButton className="h-9 w-9 cursor-pointer rounded-xl overflow-hidden border-2 border-primary/20 shadow-sm transition-transform hover:scale-105 active:scale-95">
                  {currentUser.image ? (
                    <Image
                      src={currentUser.image}
                      alt="プロフィール画像"
                      width={36}
                      height={36}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-primary/10 flex items-center justify-center">
                      <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </LogoutButton>
              </div>
            </section>

            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <DashboardNavMobile navLinks={navLinks} />
    </div>
  )
}
