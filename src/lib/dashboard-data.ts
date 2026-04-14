import { prisma } from "@/lib/prisma"
import { unstable_cache } from "next/cache"
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
  loginStreak: number
  checkInStreak: number
  maxLoginStreak: number
  maxCheckInStreak: number
  isRemoteCheckIn?: boolean
}

export function formatPoint(points: number) {
  return points > 0 ? `+${points}` : String(points)
}

export function getCheckInStatusLabel(status: string) {
  if (status === "EARLY") return "早着"
  if (status === "LATE") return "遅刻"
  if (status === "ON_TIME") return "時間内"
  if (status === "REMOTE") return "在宅勤務"
  return status
}

export function getTaskTypeLabel(type: string) {
  if (type === "DAILY") return "毎日"
  if (type === "WEEKLY") return "毎週"
  if (type === "MONTHLY") return "毎月"
  return type
}

export function formatDateTimeLabel(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function formatTaskRange(startAt: Date, endAt: Date) {
  return `${formatDateTimeLabel(startAt)} - ${new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(endAt)}`
}

// Helpers
function getTodayBoundaries() {
  const now = new Date()
  const jstOffset = 9 * 60 * 60 * 1000
  const nowJST = new Date(now.getTime() + jstOffset)
  const jstYear = nowJST.getUTCFullYear()
  const jstMonth = nowJST.getUTCMonth()
  const jstDate = nowJST.getUTCDate()

  const dayStart = new Date(Date.UTC(jstYear, jstMonth, jstDate, -9, 0, 0, 0))
  const nextDayStart = new Date(Date.UTC(jstYear, jstMonth, jstDate + 1, -9, 0, 0, 0))

  return { dayStart, nextDayStart }
}

function getWeekBoundaries(weekParam?: string | string[]) {
  const now = new Date()
  const selectedWeekDate = parseWeekDateParam(weekParam) ?? now
  const weekStart = startOfWeekMonday(selectedWeekDate)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  return { weekStart, weekEnd }
}

function getWeekRangeLabel(weekStart: Date, weekEnd: Date) {
  return `${new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo",
    month: "2-digit",
    day: "2-digit",
  }).format(weekStart)} - ${new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(weekEnd.getTime() - 1))}`
}


// specific loaders

export async function getOverviewData(userId: string) {
  const { dayStart, nextDayStart } = getTodayBoundaries()
  const { weekStart, weekEnd } = getWeekBoundaries()

  // Use separate try-catch for user data to handle missing columns gracefully during transitions
  let user;
  try {
    user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        points: true,
        loginStreak: true,
        checkInStreak: true,
        maxLoginStreak: true,
        maxCheckInStreak: true
      },
    })
  } catch (error) {
    console.warn("Falling back to basic user select due to missing columns:", error)
    user = await prisma.user.findUnique({
      where: { id: userId },
      select: { points: true },
    })
  }

  const [
    todayCheckIn,
    tasks,
    weeklyCheckIns,
    weeklyDoneTasks,
    advanceNotices,
    totalCheckInPoints,
    totalDoneTaskPoints,
  ] = await Promise.all([
    prisma.checkIn.findFirst({
      where: { userId, time: { gte: dayStart, lt: nextDayStart } },
      orderBy: { time: "desc" },
      select: { time: true, checkOutTime: true, pointsEarned: true, status: true },
    }),
    prisma.task.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }],
      select: { id: true, title: true, description: true, estimatedHours: true, type: true, status: true, pointsEarned: true, startAt: true, endAt: true, completedAt: true, createdAt: true },
    }),
    prisma.checkIn.findMany({
      where: { userId, time: { gte: weekStart, lt: weekEnd } },
      select: { time: true, checkOutTime: true, pointsEarned: true, status: true },
    }),
    prisma.task.findMany({
      where: { userId, status: "DONE", completedAt: { gte: weekStart, lt: weekEnd } },
      select: { pointsEarned: true, estimatedHours: true },
    }),
    prisma.exceptionRequest.findMany({
      where: { userId, date: { gte: dayStart } },
      orderBy: { date: "asc" },
      select: { id: true, type: true, date: true, newTargetTime: true, reason: true, status: true, createdAt: true },
    }),
    prisma.checkIn.aggregate({
      where: { userId },
      _sum: { pointsEarned: true },
    }),
    prisma.task.findMany({
      where: { userId, status: "DONE" },
      select: { pointsEarned: true, estimatedHours: true },
    }),
  ])

  if (!user) return null

  const totalCheckInPointsValue = totalCheckInPoints._sum.pointsEarned ?? 0
  const totalTaskPointsValue = totalDoneTaskPoints.reduce((sum, item) => sum + (item.pointsEarned ?? Math.floor(item.estimatedHours / 0.5)), 0)

  const computedTotalPoints = totalCheckInPointsValue + totalTaskPointsValue

  const todayTasks = tasks
    .filter((task) => task.startAt && task.endAt && task.startAt >= dayStart && task.startAt < nextDayStart)
    .map((task) => ({ id: task.id, title: task.title, description: task.description, estimatedHours: task.estimatedHours, type: task.type, status: task.status, pointsEarned: task.pointsEarned, startAt: task.startAt ? task.startAt.toISOString() : null, endAt: task.endAt ? task.endAt.toISOString() : null }))

  const weeklyCheckInPoints = weeklyCheckIns.reduce((sum, item) => sum + item.pointsEarned, 0)
  const weeklyCheckInCount = weeklyCheckIns.length
  const weeklyTaskPoints = weeklyDoneTasks.reduce((sum, item) => sum + (item.pointsEarned ?? Math.floor(item.estimatedHours / 0.5)), 0)

  return {
    user: { points: computedTotalPoints },
    todayCheckIn,
    todayTasks,
    weeklyCheckInPoints,
    weeklyCheckInCount,
    weeklyTaskPoints,
    doneTaskCount: tasks.filter((t) => t.status === "DONE").length,
    advanceNotices,
    checkedInTimeLabel: todayCheckIn ? formatTimeLabel(todayCheckIn.time) : null,
    checkedOutTimeLabel: todayCheckIn?.checkOutTime ? formatTimeLabel(todayCheckIn.checkOutTime) : null,
    todayPointLabel: todayCheckIn ? formatPoint(todayCheckIn.pointsEarned) : null,
    weekRangeLabel: getWeekRangeLabel(weekStart, weekEnd),
    weekStart,
    weekEnd,
    totalCheckInPoints: totalCheckInPointsValue,
    totalTaskPoints: totalTaskPointsValue,
    loginStreak: (user as any)?.loginStreak ?? 0,
    checkInStreak: (user as any)?.checkInStreak ?? 0,
    maxLoginStreak: (user as any)?.maxLoginStreak ?? 0,
    maxCheckInStreak: (user as any)?.maxCheckInStreak ?? 0,
    isRemoteCheckIn: todayCheckIn?.status === "REMOTE",
  }
}

export async function getTasksData(userId: string) {
  const tasks = await prisma.task.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, description: true, estimatedHours: true, type: true, status: true, pointsEarned: true, startAt: true, endAt: true, completedAt: true, createdAt: true },
  })

  return { tasks }
}

export async function getHistoryData(userId: string) {
  const recentCheckIns = await prisma.checkIn.findMany({
    where: { userId },
    orderBy: { time: "desc" },
    take: 30,
    select: { time: true, checkOutTime: true, pointsEarned: true, status: true, targetTime: true },
  })

  return { recentCheckIns }
}

export async function getCalendarData(userId: string, weekParam?: string | string[]) {
  const { weekStart, weekEnd } = getWeekBoundaries(weekParam)
  const { dayStart, nextDayStart } = getTodayBoundaries()

  const [tasks, weeklyCheckIns, weeklyDoneTasks, allTasks, todayCheckIn] = await Promise.all([
    prisma.task.findMany({
      where: { userId },
      select: { id: true, title: true, description: true, estimatedHours: true, type: true, status: true, pointsEarned: true, startAt: true, endAt: true, completedAt: true, createdAt: true },
    }),
    prisma.checkIn.findMany({
      where: { userId, time: { gte: weekStart, lt: weekEnd } },
      orderBy: { time: "asc" },
      select: { time: true, checkOutTime: true, pointsEarned: true, status: true },
    }),
    prisma.task.findMany({
      where: { userId, status: "DONE", completedAt: { gte: weekStart, lt: weekEnd } },
      select: { pointsEarned: true, estimatedHours: true },
    }),
    prisma.task.findMany({
      where: { userId, startAt: { gte: dayStart, lt: nextDayStart } },
      select: { id: true, title: true, description: true, estimatedHours: true, type: true, status: true, pointsEarned: true, startAt: true, endAt: true, completedAt: true, createdAt: true },
    }),
    prisma.checkIn.findFirst({
      where: { userId, time: { gte: dayStart, lt: nextDayStart } },
      orderBy: { time: "desc" },
      select: { time: true, status: true },
    }),
  ])

  const todayTasks = allTasks.map((task) => ({ id: task.id, title: task.title, description: task.description, estimatedHours: task.estimatedHours, type: task.type, status: task.status, pointsEarned: task.pointsEarned, startAt: task.startAt ? task.startAt.toISOString() : null, endAt: task.endAt ? task.endAt.toISOString() : null }))

  const calendarTasks = tasks
    .filter((task) => task.startAt && task.endAt && task.endAt >= weekStart && task.startAt < weekEnd)
    .map((task) => ({ id: task.id, title: task.title, description: task.description, estimatedHours: task.estimatedHours, type: task.type, status: task.status, pointsEarned: task.pointsEarned, startAt: task.startAt ? task.startAt.toISOString() : null, endAt: task.endAt ? task.endAt.toISOString() : null }))

  const calendarCheckIns = weeklyCheckIns.map((checkIn) => ({
    time: checkIn.time.toISOString(), checkOutTime: checkIn.checkOutTime ? checkIn.checkOutTime.toISOString() : null, pointsEarned: checkIn.pointsEarned, status: checkIn.status,
  }))

  const previousWeek = new Date(weekStart)
  previousWeek.setDate(previousWeek.getDate() - 7)
  const nextWeek = new Date(weekStart)
  nextWeek.setDate(nextWeek.getDate() + 7)

  return {
    weekStart,
    weekEnd,
    weekRangeLabel: getWeekRangeLabel(weekStart, weekEnd),
    previousWeek,
    nextWeek,
    calendarTasks,
    calendarCheckIns,
    todayTasks,
    weeklyCheckInPoints: weeklyCheckIns.reduce((sum, item) => sum + item.pointsEarned, 0),
    weeklyTaskPoints: weeklyDoneTasks.reduce((sum, item) => sum + (item.pointsEarned ?? Math.floor(item.estimatedHours / 0.5)), 0),
    checkedInTimeLabel: todayCheckIn ? formatTimeLabel(todayCheckIn.time) : null,
    isRemoteCheckIn: todayCheckIn?.status === "REMOTE",
  }
}

// Combined Dashboard Data for backward compatibility and simpler transitions if needed
export async function getDashboardData(userId: string, weekParam?: string | string[]): Promise<DashboardData | null> {
  const [overview, tasksData, historyData, calendar] = await Promise.all([
    getOverviewData(userId),
    getTasksData(userId),
    getHistoryData(userId),
    getCalendarData(userId, weekParam),
  ])

  if (!overview) return null

  return {
    user: overview.user,
    todayCheckIn: overview.todayCheckIn,
    tasks: tasksData.tasks,
    weeklyCheckIns: [] as DashboardCheckInSummary[], // Fallbacks
    weeklyDoneTasks: [] as DashboardDoneTaskSummary[], // Fallbacks
    recentCheckIns: historyData.recentCheckIns,
    advanceNotices: overview.advanceNotices,
    weekStart: overview.weekStart,
    weekEnd: overview.weekEnd,
    weekRangeLabel: overview.weekRangeLabel,
    previousWeek: calendar.previousWeek,
    nextWeek: calendar.nextWeek,
    checkedInTimeLabel: overview.checkedInTimeLabel,
    checkedOutTimeLabel: overview.checkedOutTimeLabel,
    todayPointLabel: overview.todayPointLabel,
    weeklyCheckInPoints: overview.weeklyCheckInPoints,
    weeklyTaskPoints: overview.weeklyTaskPoints,
    doneTaskCount: overview.doneTaskCount,
    calendarTasks: calendar.calendarTasks,
    calendarCheckIns: calendar.calendarCheckIns,
    todayTasks: overview.todayTasks,
    loginStreak: overview.loginStreak,
    checkInStreak: overview.checkInStreak,
    maxLoginStreak: overview.maxLoginStreak,
    maxCheckInStreak: overview.maxCheckInStreak,
    isRemoteCheckIn: overview.isRemoteCheckIn,
  }
}

// Types for ranking and today's activity
export type RankedUser = {
  id: string
  name: string | null
  image: string | null
  totalPoints: number
  rank: number
}

export type TodayUserActivity = {
  id: string
  name: string | null
  image: string | null
  targetTime: string | null
  checkInTime: Date | null
  checkOutTime: Date | null
  checkInStatus: string | null
  checkInPoints: number
  taskCompletionRate: number | null
  completedTaskCount: number
  totalTaskCount: number
}

// Get day-of-week key for target time fields
function getDayTargetTimeKey(): string {
  const now = new Date()
  const jstOffset = 9 * 60 * 60 * 1000
  const nowJST = new Date(now.getTime() + jstOffset)
  const day = nowJST.getUTCDay()
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  return dayNames[day]
}

export async function getAllUsersRankingAndTodayActivity(): Promise<{
  ranking: RankedUser[]
  todayActivity: TodayUserActivity[]
}> {
  const { dayStart, nextDayStart } = getTodayBoundaries()
  const dayKey = getDayTargetTimeKey()
  const targetTimeField = `targetTime${dayKey}` as const

  // Get all users with their points data
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      image: true,
      targetTimeMon: true,
      targetTimeTue: true,
      targetTimeWed: true,
      targetTimeThu: true,
      targetTimeFri: true,
      targetTimeSat: true,
      targetTimeSun: true,
    },
  })

  // Get all check-in points and task points for all users in parallel
  const [allCheckInPoints, allDoneTaskPoints, todayCheckIns, todayTasks] = await Promise.all([
    prisma.checkIn.groupBy({
      by: ["userId"],
      _sum: { pointsEarned: true },
    }),
    prisma.task.findMany({
      where: { status: "DONE" },
      select: { userId: true, pointsEarned: true, estimatedHours: true },
    }),
    prisma.checkIn.findMany({
      where: { time: { gte: dayStart, lt: nextDayStart } },
      orderBy: { time: "desc" },
      select: { userId: true, time: true, checkOutTime: true, pointsEarned: true, status: true, targetTime: true },
    }),
    prisma.task.findMany({
      where: {
        OR: [
          { startAt: { gte: dayStart, lt: nextDayStart } },
          { type: "DAILY" },
        ],
      },
      select: { id: true, userId: true, title: true, status: true, estimatedHours: true, startAt: true, type: true },
    }),
  ])

  // Build check-in points map
  const checkInPointsMap = new Map<string, number>()
  for (const item of allCheckInPoints) {
    checkInPointsMap.set(item.userId, item._sum.pointsEarned ?? 0)
  }

  // Build task points map
  const taskPointsMap = new Map<string, number>()
  for (const item of allDoneTaskPoints) {
    const pts = item.pointsEarned ?? Math.floor(item.estimatedHours / 0.5)
    taskPointsMap.set(item.userId, (taskPointsMap.get(item.userId) ?? 0) + pts)
  }

  // Build today's check-in map (first per user since ordered desc)
  const todayCheckInMap = new Map<string, typeof todayCheckIns[0]>()
  for (const ci of todayCheckIns) {
    if (!todayCheckInMap.has(ci.userId)) {
      todayCheckInMap.set(ci.userId, ci)
    }
  }

  // Build today's tasks map
  const todayTasksMap = new Map<string, typeof todayTasks>()
  for (const task of todayTasks) {
    if (!todayTasksMap.has(task.userId)) {
      todayTasksMap.set(task.userId, [])
    }
    todayTasksMap.get(task.userId)!.push(task)
  }

  // Build ranking
  const rankedUsers: RankedUser[] = users
    .map((user) => ({
      id: user.id,
      name: user.name,
      image: user.image,
      totalPoints: (checkInPointsMap.get(user.id) ?? 0) + (taskPointsMap.get(user.id) ?? 0),
      rank: 0,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((user, index) => ({ ...user, rank: index + 1 }))

  // Build today's activity
  const todayActivity: TodayUserActivity[] = users.map((user) => {
    const ci = todayCheckInMap.get(user.id)
    const tasks = todayTasksMap.get(user.id) ?? []
    const targetTime = (user as Record<string, unknown>)[targetTimeField] as string | null

    const totalTaskCount = tasks.length
    const completedTaskCount = tasks.filter((t) => t.status === "DONE").length
    const taskCompletionRate = totalTaskCount > 0 ? Math.round((completedTaskCount / totalTaskCount) * 100) : null

    return {
      id: user.id,
      name: user.name,
      image: user.image,
      targetTime: targetTime ?? "09:00",
      checkInTime: ci?.time ?? null,
      checkOutTime: ci?.checkOutTime ?? null,
      checkInStatus: ci?.status ?? null,
      checkInPoints: ci?.pointsEarned ?? 0,
      taskCompletionRate,
      completedTaskCount,
      totalTaskCount,
    }
  })

  return { ranking: rankedUsers, todayActivity }
}
