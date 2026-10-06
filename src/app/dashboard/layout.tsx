import { redirect } from "next/navigation"

import { AiChatFab } from "@/components/ai-chat-fab"
import { DashboardNavDesktop, DashboardNavMobile } from "@/components/dashboard-nav"
import { LogoutButton } from "@/components/logout-button"
import { getCurrentUser } from "@/lib/current-user"
import { updateUserLoginStreak } from "@/lib/streak-utils"

type DashboardLayoutProps = {
  children: React.ReactNode
}

const navLinks = [
  { href: "/dashboard/overview", label: "ダッシュボード", icon: "dashboard" },
  { href: "/dashboard/community", label: "コミュニティ", icon: "community" },
  { href: "/dashboard/week", label: "カレンダー", icon: "calendar" },
  { href: "/dashboard/history", label: "履歴", icon: "history" },
  { href: "/dashboard/ai", label: "AI", icon: "ai" },
  { href: "/dashboard/settings", label: "設定", icon: "settings" },
]

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const currentUser = await getCurrentUser()

  if (!currentUser?.id) {
    redirect("/login")
  }

  await updateUserLoginStreak(currentUser.id)

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground selection:bg-primary/20">
      <div className="relative z-10 flex w-full lg:min-h-screen">
        {/* Desktop Sidebar */}
        <aside className="glass fixed top-0 left-0 z-40 hidden h-screen w-65 border-r border-sidebar-border px-4 py-6 lg:flex lg:flex-col">
          {/* Brand */}
          <div className="mb-8 px-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-foreground text-white">
                <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-[15px] font-semibold leading-tight tracking-tight text-foreground">Lab Check-in</p>
                <p className="text-xs text-muted-foreground">研究室</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <DashboardNavDesktop navLinks={navLinks} />

          {/* User Card (bottom) */}
          <div className="mt-auto pt-4">
            <LogoutButton className="flex w-full cursor-pointer items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-black/[0.05] active:bg-black/[0.08]">
              <div className="relative">
                {(currentUser.customImage || currentUser.image) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentUser.customImage ?? currentUser.image!}
                    alt="プロフィール画像"
                    className="h-9 w-9 rounded-full object-cover ring-1 ring-black/5"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center">
                    <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{currentUser.username || currentUser.name || "ユーザー"}</p>
                <p className="text-[11px] text-muted-foreground">ログアウト</p>
              </div>
              {currentUser.mode === "dev-bypass" ? (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  DEV
                </span>
              ) : null}
            </LogoutButton>
          </div>
        </aside>

        {/* Main Content */}
        <main className="w-full px-4 pb-28 pt-0 sm:px-6 lg:ml-65 lg:flex-1 lg:px-10 lg:pt-10 lg:pb-12">
          <div className="mx-auto w-full max-w-300">
            {/* Mobile Header */}
            <section className="glass sticky top-0 z-30 -mx-4 mb-5 border-b px-4 py-3 sm:-mx-6 sm:px-6 lg:hidden">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-foreground text-white">
                    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold leading-tight tracking-tight">Lab Check-in</p>
                    <p className="text-xs text-muted-foreground">研究室</p>
                  </div>
                </div>
                <LogoutButton className="h-9 w-9 cursor-pointer rounded-full overflow-hidden ring-1 ring-black/5 transition-opacity active:opacity-70">
                  {(currentUser.customImage || currentUser.image) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentUser.customImage ?? currentUser.image!}
                      alt="プロフィール画像"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-secondary flex items-center justify-center">
                      <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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

      <AiChatFab />

      {/* Mobile Bottom Nav */}
      <DashboardNavMobile navLinks={navLinks} />
    </div>
  )
}
