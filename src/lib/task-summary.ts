export type TaskSummaryItem = {
  title: string
  status: string
  estimatedHours?: number | null
}

type BuildMorningReportOptions = {
  date: Date
  tasks: TaskSummaryItem[]
  checkedInTimeLabel: string | null
}

type BuildEveningReportOptions = {
  date: Date
  tasks: TaskSummaryItem[]
  checkedInTimeLabel: string | null
  checkedOutTimeLabel: string | null
}

function formatReportDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const weekday = new Intl.DateTimeFormat("ja-JP", {
    weekday: "short",
  }).format(date)
  return `${year}/${month}/${day}(${weekday})`
}

export function buildMorningReportText({
  date,
  tasks,
  checkedInTimeLabel,
}: BuildMorningReportOptions): string {
  const dateStr = formatReportDate(date)

  const taskCount = tasks.length
  const totalHours = tasks.reduce((sum, task) => {
    const hours = typeof task.estimatedHours === "number" && Number.isFinite(task.estimatedHours)
      ? task.estimatedHours
      : 0
    return sum + hours
  }, 0)

  return [
    `【朝日報：${dateStr}】`,
    `⏰ チェックイン時刻: ${checkedInTimeLabel ?? ""}🏠`,
    `✅ タスク: ${taskCount}個`,
    `⏱️ タスク合計時間: ${totalHours}h`,
  ].join("\n")
}

export function buildEveningReportText({
  date,
  tasks,
  checkedInTimeLabel,
  checkedOutTimeLabel,
}: BuildEveningReportOptions): string {
  const dateStr = formatReportDate(date)

  const totalCount = tasks.length
  const doneCount = tasks.filter((t) => t.status === "DONE").length
  const completionRate = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  return [
    `【夜日報：${dateStr}】`,
    `⏰ チェックイン時刻: ${checkedInTimeLabel ?? ""}🏠`,
    `🚪 退勤時刻: ${checkedOutTimeLabel ?? ""}🏠`,
    `📊 タスク完了率: ${completionRate}%(${doneCount}/${totalCount}個)`,
  ].join("\n")
}

// Keep backward compatibility alias
export function buildTaskSummaryText({
  date,
  tasks,
}: {
  date: Date
  tasks: TaskSummaryItem[]
  headline?: string
}): string {
  return buildMorningReportText({ date, tasks, checkedInTimeLabel: null })
}
