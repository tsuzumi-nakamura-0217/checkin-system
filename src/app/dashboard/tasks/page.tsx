import { redirect } from "next/navigation"

import { TaskCreateForm } from "@/components/task-create-form"
import { TaskCard } from "@/components/task-card"
import { getDashboardData } from "@/lib/dashboard-data"
import { getCurrentUser } from "@/lib/current-user"

export default async function DashboardTasksPage() {
  const currentUser = await getCurrentUser()

  if (!currentUser?.id) {
    redirect("/login")
  }

  const data = await getDashboardData(currentUser.id)

  if (!data) {
    redirect("/login")
  }

  return (
    <section className="space-y-8 tracking-tight">
      <div className="flex items-center justify-between">
        <h2>タスク</h2>
        <span className="rounded-full border border-border bg-secondary px-3 py-1 text-sm font-medium text-muted-foreground">
          {data.doneTaskCount} / {data.tasks.length} 完了
        </span>
      </div>

      <TaskCreateForm />

      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        {data.tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">タスクがありません。上のフォームから追加してください。</p>
        ) : (
          <ul className="space-y-3">
            {data.tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </ul>
        )}
      </section>
    </section>
  )
}
