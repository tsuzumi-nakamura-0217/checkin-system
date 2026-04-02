import { redirect } from "next/navigation"

import { TaskCreateForm } from "@/components/task-create-form"
import { TaskCard } from "@/components/task-card"
import { getTasksData } from "@/lib/dashboard-data"
import { getCurrentUser } from "@/lib/current-user"

export default async function DashboardTasksPage() {
  const currentUser = await getCurrentUser()

  if (!currentUser?.id) {
    redirect("/login")
  }

  const data = await getTasksData(currentUser.id)

  if (!data) {
    redirect("/login")
  }

  const doneCount = data.tasks.filter((t) => t.status === "DONE").length

  return (
    <section className="space-y-5 tracking-tight animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary text-white shadow-sm">
            <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h2>タスク</h2>
        </div>
        <span className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold tabular-nums text-muted-foreground shadow-sm">
          <span className="text-primary">{doneCount}</span> / {data.tasks.length} 完了
        </span>
      </div>

      <TaskCreateForm />

      <section className="rounded-2xl border border-border bg-card p-5 shadow-themed sm:p-7">
        {data.tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/8 text-primary mb-4">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-foreground">タスクがありません</p>
            <p className="mt-1 text-xs text-muted-foreground">上のボタンから新しいタスクを追加してください。</p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {data.tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </ul>
        )}
      </section>
    </section>
  )
}
