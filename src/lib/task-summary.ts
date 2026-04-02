export type TaskSummaryItem = {
  title: string
  status: string
  estimatedHours?: number | null
}

type BuildTaskSummaryTextOptions = {
  date: Date
  tasks: TaskSummaryItem[]
  headline?: string
}

export function buildTaskSummaryText({
  date,
  tasks,
  headline = "本日のタスク概要",
}: BuildTaskSummaryTextOptions): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const weekday = new Intl.DateTimeFormat("ja-JP", {
    weekday: "short",
  }).format(date)

  const taskCount = tasks.length
  const totalHours = tasks.reduce((sum, task) => {
    const hours = typeof task.estimatedHours === "number" && Number.isFinite(task.estimatedHours)
      ? task.estimatedHours
      : 0
    return sum + hours
  }, 0)

  return [
    `${year}/${month}/${day}(${weekday}) ${headline}`,
    `- タスク個数: ${taskCount}件`,
    `- 合計時間: ${totalHours}時間`,
  ].join("\n")
}
