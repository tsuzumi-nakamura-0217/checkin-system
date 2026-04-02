import { prisma } from "@/lib/prisma"
import {
  formatTimeLabel,
  parseWeekDateParam,
  startOfWeekMonday,
} from "@/lib/calendar-utils"

export type DashboardUserSummary = {
  points: number
}

export type DashboardCheckInSummary = {
  time: Date
  checkOutTime: Date | null
  pointsEarned: number
  status: string
}

export type DashboardTask = {
  id: string
  title: string
  description: string | null
  estimatedHours: number
  type: string
  status: string
  pointsEarned: number | null
  startAt: Date | null
  endAt: Date | null
  completedAt: Date | null
  createdAt: Date
}

export type DashboardDoneTaskSummary = {
  pointsEarned: number | null
  estimatedHours: number
}

export type DashboardCheckInHistory = DashboardCheckInSummary & {
  targetTime: string
}

export type DashboardCalendarTask = {
  id: string
  title: string
  description: string | null
  estimatedHours: number
  type: string
  status: string
  pointsEarned: number | null
  startAt: string | null
  endAt: string | null
}

export type DashboardCalendarCheckIn = {
  time: string
  checkOutTime: string | null
  pointsEarned: number
  status: string
}

export type DashboardAdvanceNotice = {
  id: string
  type: string
  date: Date
  newTargetTime: string | null
  reason: string
  status: string
  createdAt: Date
}

export type DashboardData = {
  user: DashboardUserSummary
  todayCheckIn: DashboardCheckInSummary | null
  tasks: DashboardTask[]
  weeklyCheckIns: DashboardCheckInSummary[]
  weeklyDoneTasks: DashboardDoneTaskSummary[]
  recentCheckIns: DashboardCheckInHistory[]
  advanceNotices: DashboardAdvanceNotice[]
  weekStart: Date
  weekEnd: Date
  weekRangeLabel: string
  previousWeek: Date
  nextWeek: Date
  checkedInTimeLabel: string | null
  checkedOutTimeLabel: string | null
  todayPointLabel: string | null
  weeklyCheckInPoints: number
  weeklyTaskPoints: number
  doneTaskCount: number
  calendarTasks: DashboardCalendarTask[]
  calendarCheckIns: DashboardCalendarCheckIn[]
  todayTasks: DashboardCalendarTask[]
}

export function formatPoint(points: number) {
  return points > 0 ? `+${points}` : String(points)
}

export function getCheckInStatusLabel(status: string) {
  if (status === "EARLY") return "早着"
  if (status === "LATE") return "遅刻"
  if (status === "ON_TIME") return "時間内"
  return status
}

export function getTaskTypeLabel(type: string) {
  if (type === "DAILY") return "毎日"
  if (type === "WEEKLY") return "毎週"
  if (type === "MONTHLY") return "毎月"
  return type
}

export function formatDateTimeLabel(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function formatTaskRange(startAt: Date, endAt: Date) {
  return `${formatDateTimeLabel(startAt)} - ${new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(endAt)}`
}

export async function getDashboardData(
  userId: string,
  weekParam?: string | string[]
): Promise<DashboardData | null> {
  const now = new Date()

  const dayStart = new Date(now)
  dayStart.setHours(0, 0, 0, 0)
  const nextDayStart = new Date(dayStart)
  nextDayStart.setDate(nextDayStart.getDate() + 1)

  const selectedWeekDate = parseWeekDateParam(weekParam) ?? now
  const weekStart = startOfWeekMonday(selectedWeekDate)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const [
    user,
    todayCheckIn,
    tasks,
    weeklyCheckIns,
    weeklyDoneTasks,
    recentCheckIns,
    advanceNotices,
    totalCheckInPoints,
    totalDoneTaskPoints,
  ]: [
    DashboardUserSummary | null,
    DashboardCheckInSummary | null,
    DashboardTask[],
    DashboardCheckInSummary[],
    DashboardDoneTaskSummary[],
    DashboardCheckInHistory[],
    DashboardAdvanceNotice[],
    { _sum: { pointsEarned: number | null } },
    DashboardDoneTaskSummary[]
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        points: true,
      },
    }),
    prisma.checkIn.findFirst({
      where: {
        userId,
        time: {
          gte: dayStart,
          lt: nextDayStart,
        },
      },
      orderBy: {
        time: "desc",
      },
      select: {
        time: true,
        checkOutTime: true,
        pointsEarned: true,
        status: true,
      },
    }),
    prisma.task.findMany({
      where: {
        userId,
      },
      orderBy: [
        {
          createdAt: "desc",
        },
      ],
      select: {
        id: true,
        title: true,
        description: true,
        estimatedHours: true,
        type: true,
        status: true,
        pointsEarned: true,
        startAt: true,
        endAt: true,
        completedAt: true,
        createdAt: true,
      },
    }),
    prisma.checkIn.findMany({
      where: {
        userId,
        time: {
          gte: weekStart,
          lt: weekEnd,
        },
      },
      orderBy: {
        time: "asc",
      },
      select: {
        time: true,
        checkOutTime: true,
        pointsEarned: true,
        status: true,
      },
    }),
    prisma.task.findMany({
      where: {
        userId,
        status: "DONE",
        completedAt: {
          gte: weekStart,
          lt: weekEnd,
        },
      },
      select: {
        pointsEarned: true,
        estimatedHours: true,
      },
    }),
    prisma.checkIn.findMany({
      where: {
        userId,
      },
      orderBy: {
        time: "desc",
      },
      take: 30,
      select: {
        time: true,
        checkOutTime: true,
        pointsEarned: true,
        status: true,
        targetTime: true,
      },
    }),
    prisma.exceptionRequest.findMany({
      where: {
        userId,
        date: {
          gte: dayStart,
        },
      },
      orderBy: {
        date: "asc",
      },
      select: {
        id: true,
        type: true,
        date: true,
        newTargetTime: true,
        reason: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.checkIn.aggregate({
      where: { userId },
      _sum: {
        pointsEarned: true,
      },
    }),
    prisma.task.findMany({
      where: {
        userId,
        status: "DONE",
      },
      select: {
        pointsEarned: true,
        estimatedHours: true,
      },
    }),
  ])

  if (!user) {
    return null
  }

  const computedTotalPoints =
    (totalCheckInPoints._sum.pointsEarned ?? 0) +
    totalDoneTaskPoints.reduce(
      (sum, item) => sum + (item.pointsEarned ?? item.estimatedHours * 10),
      0
    )

  const checkedInTimeLabel = todayCheckIn ? formatTimeLabel(todayCheckIn.time) : null
  const checkedOutTimeLabel = todayCheckIn?.checkOutTime
    ? formatTimeLabel(todayCheckIn.checkOutTime)
    : null
  const todayPointLabel = todayCheckIn ? formatPoint(todayCheckIn.pointsEarned) : null

  const weeklyCheckInPoints = weeklyCheckIns.reduce((sum, item) => sum + item.pointsEarned, 0)
  const weeklyTaskPoints = weeklyDoneTasks.reduce(
    (sum, item) => sum + (item.pointsEarned ?? item.estimatedHours * 10),
    0
  )
  const doneTaskCount = tasks.filter((task) => task.status === "DONE").length

  const weekRangeLabel = `${new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
  }).format(weekStart)} - ${new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(weekEnd.getTime() - 1))}`

  const previousWeek = new Date(weekStart)
  previousWeek.setDate(previousWeek.getDate() - 7)
  const nextWeek = new Date(weekStart)
  nextWeek.setDate(nextWeek.getDate() + 7)

  const calendarTasks = tasks
    .filter((task) => task.startAt && task.endAt && task.endAt >= weekStart && task.startAt < weekEnd)
    .map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      estimatedHours: task.estimatedHours,
      type: task.type,
      status: task.status,
      pointsEarned: task.pointsEarned,
      startAt: task.startAt ? task.startAt.toISOString() : null,
      endAt: task.endAt ? task.endAt.toISOString() : null,
    }))

  const todayTasks = tasks
    .filter((task) => task.startAt && task.endAt && task.startAt >= dayStart && task.startAt < nextDayStart)
    .map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      estimatedHours: task.estimatedHours,
      type: task.type,
      status: task.status,
      pointsEarned: task.pointsEarned,
      startAt: task.startAt ? task.startAt.toISOString() : null,
      endAt: task.endAt ? task.endAt.toISOString() : null,
    }))

  const calendarCheckIns = weeklyCheckIns.map((checkIn) => ({
    time: checkIn.time.toISOString(),
    checkOutTime: checkIn.checkOutTime ? checkIn.checkOutTime.toISOString() : null,
    pointsEarned: checkIn.pointsEarned,
    status: checkIn.status,
  }))

  return {
    user: {
      points: computedTotalPoints,
    },
    todayCheckIn,
    tasks,
    weeklyCheckIns,
    weeklyDoneTasks,
    recentCheckIns,
    advanceNotices,
    weekStart,
    weekEnd,
    weekRangeLabel,
    previousWeek,
    nextWeek,
    checkedInTimeLabel,
    checkedOutTimeLabel,
    todayPointLabel,
    weeklyCheckInPoints,
    weeklyTaskPoints,
    doneTaskCount,
    calendarTasks,
    calendarCheckIns,
    todayTasks,
  }
}
