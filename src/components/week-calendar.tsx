"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { formatTimeLabel, toDayKey } from "@/lib/calendar-utils"

type CalendarTask = {
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

type ScheduledCalendarTask = CalendarTask & {
  startDate: Date
  endDate: Date
}

type CalendarCheckIn = {
  time: string
  checkOutTime: string | null
  status: string
  pointsEarned: number
}

type WeekCalendarProps = {
  weekStartIso: string
  tasks: CalendarTask[]
  checkIns: CalendarCheckIn[]
}

type SlotPointer = {
  dayIndex: number
  slotIndex: number
}

type SelectedRange = {
  startAt: Date
  endAt: Date
}

type EditTaskState = {
  taskId: string
  originalStatus: "TODO" | "DONE"
}

const SLOT_MINUTES = 30
const SLOT_HEIGHT = 28
const PX_PER_MINUTE = SLOT_HEIGHT / SLOT_MINUTES
const DAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"] as const
const DEFAULT_START_HOUR = 6
const DEFAULT_END_HOUR = 24

function addDays(base: Date, days: number): Date {
  const date = new Date(base)
  date.setDate(date.getDate() + days)
  return date
}

function getCheckInStatusLabel(status: string): string {
  if (status === "EARLY") return "早着"
  if (status === "LATE") return "遅刻"
  if (status === "ON_TIME") return "時間内"
  if (status === "REMOTE") return "在宅"
  return status
}

function getCheckInStatusColor(status: string): string {
  if (status === "EARLY") return "bg-accent text-accent-foreground"
  if (status === "LATE") return "bg-destructive/10 text-destructive"
  if (status === "ON_TIME") return "bg-primary/10 text-primary"
  if (status === "REMOTE") return "bg-amber-100 text-amber-700"
  return "bg-muted text-muted-foreground"
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function getMinutesFromWindowStart(date: Date, dayReference: Date, startHour: number): number {
  const windowStart = new Date(dayReference)
  windowStart.setHours(startHour, 0, 0, 0)
  return Math.round((date.getTime() - windowStart.getTime()) / (60 * 1000))
}

function buildDateFromSlot(weekStart: Date, dayIndex: number, slotIndex: number, startHour: number): Date {
  const date = addDays(weekStart, dayIndex)
  date.setHours(startHour, 0, 0, 0)
  date.setMinutes(date.getMinutes() + slotIndex * SLOT_MINUTES)
  return date
}

function toDurationLabel(start: Date, end: Date): string {
  return `${formatTimeLabel(start)} - ${formatTimeLabel(end)}`
}

function toDateTimeLocalValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hour = String(date.getHours()).padStart(2, "0")
  const minute = String(date.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day}T${hour}:${minute}`
}

function parseLocalDateTime(value: string): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function getCurrentTimePosition(dayDate: Date, startHour: number, totalMinutes: number): number | null {
  const now = new Date()
  const dayStart = new Date(dayDate)
  dayStart.setHours(startHour, 0, 0, 0)
  const dayEnd = new Date(dayStart.getTime() + totalMinutes * 60 * 1000)
  if (now < dayStart || now > dayEnd) return null
  const minutesFromStart = (now.getTime() - dayStart.getTime()) / (60 * 1000)
  return minutesFromStart * PX_PER_MINUTE
}

export function WeekCalendar({ weekStartIso, tasks, checkIns }: WeekCalendarProps) {
  const router = useRouter()
  const suppressNextTaskClickRef = useRef(false)
  const suppressPostDragClickRef = useRef(false)
  const [hasMounted, setHasMounted] = useState(false)

  // User-configurable time range
  const [startHour, setStartHour] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("calendar-start-hour")
      return saved ? parseInt(saved, 10) : DEFAULT_START_HOUR
    }
    return DEFAULT_START_HOUR
  })
  const [endHour, setEndHour] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("calendar-end-hour")
      return saved ? parseInt(saved, 10) : DEFAULT_END_HOUR
    }
    return DEFAULT_END_HOUR
  })
  const [showTimeSettings, setShowTimeSettings] = useState(false)

  const slotCount = ((endHour - startHour) * 60) / SLOT_MINUTES
  const totalHeight = slotCount * SLOT_HEIGHT
  const totalMinutes = (endHour - startHour) * 60

  useEffect(() => {
    localStorage.setItem("calendar-start-hour", String(startHour))
    localStorage.setItem("calendar-end-hour", String(endHour))
  }, [startHour, endHour])

  const [dragStart, setDragStart] = useState<SlotPointer | null>(null)
  const [dragCurrent, setDragCurrent] = useState<SlotPointer | null>(null)
  const [taskDragContext, setTaskDragContext] = useState<{
    taskId: string
    durationSlots: number
    initialDayIndex: number
    initialSlotIndex: number
  } | null>(null)
  const [taskDragCurrent, setTaskDragCurrent] = useState<SlotPointer | null>(null)
  const [taskResizeContext, setTaskResizeContext] = useState<{
    taskId: string
    edge: "start" | "end"
    dayIndex: number
    initialStartSlot: number
    initialEndSlot: number
  } | null>(null)
  const [taskResizeCurrent, setTaskResizeCurrent] = useState<SlotPointer | null>(null)
  const [didTaskDragMove, setDidTaskDragMove] = useState(false)
  const [selectedRange, setSelectedRange] = useState<SelectedRange | null>(null)
  const [editingTask, setEditingTask] = useState<EditTaskState | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [estimatedHours, setEstimatedHours] = useState(1)
  const [status, setStatus] = useState<"TODO" | "DONE">("TODO")
  const [startAtInput, setStartAtInput] = useState("")
  const [endAtInput, setEndAtInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const [currentTimeTick, setCurrentTimeTick] = useState(Date.now())

  useEffect(() => { setHasMounted(true) }, [])

  // Current time ticker
  useEffect(() => {
    const interval = setInterval(() => setCurrentTimeTick(Date.now()), 60000)
    return () => clearInterval(interval)
  }, [])

  const [localTasks, setLocalTasks] = useState<CalendarTask[]>(tasks)
  useEffect(() => { setLocalTasks(tasks) }, [tasks])

  const weekStart = useMemo(() => new Date(weekStartIso), [weekStartIso])

  const checkInByDay = useMemo(() => {
    const map = new Map<string, CalendarCheckIn>()
    for (const checkIn of checkIns) {
      const time = new Date(checkIn.time)
      if (Number.isNaN(time.getTime())) continue
      const key = toDayKey(time)
      if (!map.has(key)) map.set(key, checkIn)
    }
    return map
  }, [checkIns])

  const tasksByDay = useMemo(() => {
    const map = new Map<string, ScheduledCalendarTask[]>()
    for (const task of localTasks) {
      if (!task.startAt || !task.endAt) continue
      const startDate = new Date(task.startAt)
      const endDate = new Date(task.endAt)
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) continue
      if (endDate <= startDate) continue
      const key = toDayKey(startDate)
      const current = map.get(key) ?? []
      current.push({ ...task, startDate, endDate })
      map.set(key, current)
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
    }
    return map
  }, [localTasks])

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => {
      const date = addDays(weekStart, index)
      const key = toDayKey(date)
      return { index, date, key, checkIn: checkInByDay.get(key) ?? null, tasks: tasksByDay.get(key) ?? [] }
    }),
    [checkInByDay, tasksByDay, weekStart]
  )

  const activeSelection = useMemo(() => {
    if (!dragStart || !dragCurrent) return null
    if (dragStart.dayIndex !== dragCurrent.dayIndex) return null
    const s = Math.min(dragStart.slotIndex, dragCurrent.slotIndex)
    const e = Math.max(dragStart.slotIndex, dragCurrent.slotIndex) + 1
    return { dayIndex: dragStart.dayIndex, startSlot: s, endSlot: e }
  }, [dragCurrent, dragStart])

  const closeModal = () => {
    setSelectedRange(null); setEditingTask(null); setTitle(""); setDescription("")
    setEstimatedHours(1); setStatus("TODO"); setStartAtInput(""); setEndAtInput("")
    setIsDeleting(false); setMessage(null); setIsError(false)
  }

  const openEditModal = (task: ScheduledCalendarTask) => {
    setSelectedRange(null)
    setEditingTask({ taskId: task.id, originalStatus: task.status === "DONE" ? "DONE" : "TODO" })
    setTitle(task.title); setDescription(task.description ?? ""); setEstimatedHours(task.estimatedHours)
    setStatus(task.status === "DONE" ? "DONE" : "TODO")
    setStartAtInput(toDateTimeLocalValue(task.startDate)); setEndAtInput(toDateTimeLocalValue(task.endDate))
    setMessage(null); setIsError(false)
  }

  const updateTaskRange = useCallback(async (taskId: string, sAt: Date, eAt: Date) => {
    setLocalTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, startAt: sAt.toISOString(), endAt: eAt.toISOString() } : t))
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startAt: sAt.toISOString(), endAt: eAt.toISOString() }),
    })
    if (!response.ok) throw new Error("タスクの更新に失敗しました。")
  }, [])

  // Quick status toggle (one-click complete)
  const toggleTaskStatus = useCallback(async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "DONE" ? "TODO" : "DONE"
    setLocalTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t))
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!response.ok) throw new Error()
      router.refresh()
    } catch {
      setLocalTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: currentStatus } : t))
    }
  }, [router])

  const finalizeSelection = useCallback(() => {
    if (!activeSelection) { setDragStart(null); setDragCurrent(null); window.setTimeout(() => { suppressPostDragClickRef.current = false }, 0); return }
    const sAt = buildDateFromSlot(weekStart, activeSelection.dayIndex, activeSelection.startSlot, startHour)
    const eAt = buildDateFromSlot(weekStart, activeSelection.dayIndex, activeSelection.endSlot, startHour)
    const diffHours = Math.max(0.5, Math.round((eAt.getTime() - sAt.getTime()) / (60 * 60 * 1000) * 2) / 2)
    setSelectedRange({ startAt: sAt, endAt: eAt }); setEditingTask(null); setTitle(""); setDescription(""); setStatus("TODO")
    setStartAtInput(""); setEndAtInput(""); setEstimatedHours(diffHours); setDragStart(null); setDragCurrent(null)
    setMessage(null); setIsError(false)
    window.setTimeout(() => { suppressPostDragClickRef.current = false }, 0)
  }, [activeSelection, weekStart, startHour])

  const finalizeTaskSelection = useCallback(async () => {
    if (!taskDragContext || !taskDragCurrent) { setTaskDragContext(null); setTaskDragCurrent(null); setDidTaskDragMove(false); suppressPostDragClickRef.current = false; return }
    const { taskId, durationSlots } = taskDragContext
    const { dayIndex, slotIndex } = taskDragCurrent
    setTaskDragContext(null); setTaskDragCurrent(null)
    if (taskDragContext.initialDayIndex === dayIndex && taskDragContext.initialSlotIndex === slotIndex) { setDidTaskDragMove(false); suppressPostDragClickRef.current = false; return }
    const newStart = buildDateFromSlot(weekStart, dayIndex, slotIndex, startHour)
    const newEnd = new Date(newStart.getTime() + durationSlots * SLOT_MINUTES * 60 * 1000)
    try { await updateTaskRange(taskId, newStart, newEnd); router.refresh() } catch { alert("エラーが発生しました。") }
    finally { setDidTaskDragMove(false); window.setTimeout(() => { suppressPostDragClickRef.current = false }, 0) }
  }, [taskDragContext, taskDragCurrent, weekStart, router, updateTaskRange, startHour])

  const finalizeTaskResizeSelection = useCallback(async () => {
    if (!taskResizeContext || !taskResizeCurrent) { setTaskResizeContext(null); setTaskResizeCurrent(null); window.setTimeout(() => { suppressPostDragClickRef.current = false }, 0); return }
    const { taskId, dayIndex, edge, initialStartSlot, initialEndSlot } = taskResizeContext
    const resizedSlot = taskResizeCurrent.slotIndex
    setTaskResizeContext(null); setTaskResizeCurrent(null)
    const nextStartSlot = edge === "start" ? resizedSlot : initialStartSlot
    const nextEndSlot = edge === "end" ? resizedSlot : initialEndSlot
    if (nextEndSlot - nextStartSlot < 1) { window.setTimeout(() => { suppressPostDragClickRef.current = false }, 0); return }
    if (nextStartSlot === initialStartSlot && nextEndSlot === initialEndSlot) { window.setTimeout(() => { suppressPostDragClickRef.current = false }, 0); return }
    const newStart = buildDateFromSlot(weekStart, dayIndex, nextStartSlot, startHour)
    const newEnd = buildDateFromSlot(weekStart, dayIndex, nextEndSlot, startHour)
    try { await updateTaskRange(taskId, newStart, newEnd); router.refresh() } catch { alert("エラーが発生しました。") }
    finally { window.setTimeout(() => { suppressNextTaskClickRef.current = false; suppressPostDragClickRef.current = false }, 0) }
  }, [taskResizeContext, taskResizeCurrent, weekStart, router, updateTaskRange, startHour])

  useEffect(() => {
    const handleClickCapture = (event: MouseEvent) => { if (!suppressPostDragClickRef.current) return; event.preventDefault(); event.stopPropagation(); suppressPostDragClickRef.current = false }
    window.addEventListener("click", handleClickCapture, true)
    return () => { window.removeEventListener("click", handleClickCapture, true) }
  }, [])

  useEffect(() => {
    const handleMouseUp = () => { if (dragStart) finalizeSelection(); if (taskDragContext) finalizeTaskSelection(); if (taskResizeContext) finalizeTaskResizeSelection() }
    window.addEventListener("mouseup", handleMouseUp)
    return () => { window.removeEventListener("mouseup", handleMouseUp) }
  }, [dragStart, finalizeSelection, taskDragContext, finalizeTaskSelection, taskResizeContext, finalizeTaskResizeSelection])

  const handleScheduledUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingTask) return
    const parsedStartAt = parseLocalDateTime(startAtInput)
    const parsedEndAt = parseLocalDateTime(endAtInput)
    if (!title.trim()) { setIsError(true); setMessage("タスク名は必須です。"); return }
    if (!parsedStartAt || !parsedEndAt) { setIsError(true); setMessage("開始時刻と終了時刻を正しく入力してください。"); return }
    if (parsedEndAt <= parsedStartAt) { setIsError(true); setMessage("終了時刻は開始時刻より後にしてください。"); return }
    setIsSubmitting(true); setMessage(null); setIsError(false)
    try {
      const updateResponse = await fetch(`/api/tasks/${editingTask.taskId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description, estimatedHours, startAt: parsedStartAt.toISOString(), endAt: parsedEndAt.toISOString() }) })
      const updateData = (await updateResponse.json().catch(() => null)) as { success: true } | { success: false; error?: string } | null
      if (!updateResponse.ok || !updateData?.success) { const errorText = updateData && !updateData.success ? updateData.error : "タスク更新に失敗しました。"; throw new Error(errorText || "タスク更新に失敗しました。") }
      if (status !== editingTask.originalStatus) {
        const statusResponse = await fetch(`/api/tasks/${editingTask.taskId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) })
        const statusData = (await statusResponse.json().catch(() => null)) as { success: true } | { success: false; error?: string } | null
        if (!statusResponse.ok || !statusData?.success) { const errorText = statusData && !statusData.success ? statusData.error : "ステータス更新に失敗しました。"; throw new Error(errorText || "ステータス更新に失敗しました。") }
      }
      closeModal(); router.refresh()
    } catch (error) { setIsError(true); setMessage(error instanceof Error ? error.message : "タスク更新に失敗しました。") }
    finally { setIsSubmitting(false) }
  }

  const handleTaskDelete = async () => {
    if (!editingTask) return
    if (!window.confirm("このタスクを削除しますか？")) return
    setIsDeleting(true); setMessage(null); setIsError(false)
    try {
      const response = await fetch(`/api/tasks/${editingTask.taskId}`, { method: "DELETE" })
      const data = (await response.json().catch(() => null)) as { success: true } | { success: false; error?: string } | null
      if (!response.ok || !data?.success) { const errorText = data && !data.success ? data.error : "削除に失敗しました。"; throw new Error(errorText || "削除に失敗しました。") }
      closeModal(); router.refresh()
    } catch (error) { setIsError(true); setMessage(error instanceof Error ? error.message : "削除に失敗しました。") }
    finally { setIsDeleting(false) }
  }

  const handleScheduledCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedRange) return
    if (!title.trim()) { setIsError(true); setMessage("タスク名は必須です。"); return }
    setIsSubmitting(true); setMessage(null); setIsError(false)
    try {
      const response = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description, estimatedHours, startAt: selectedRange.startAt.toISOString(), endAt: selectedRange.endAt.toISOString() }) })
      const data = (await response.json().catch(() => null)) as { success: true } | { success: false; error?: string } | null
      if (!response.ok || !data?.success) { const errorText = data && !data.success ? data.error : "タスク作成に失敗しました。"; throw new Error(errorText || "タスク作成に失敗しました。") }
      closeModal(); router.refresh()
    } catch (error) { setIsError(true); setMessage(error instanceof Error ? error.message : "タスク作成に失敗しました。") }
    finally { setIsSubmitting(false) }
  }

  const selectionForDay = (dayIndex: number) => {
    if (!activeSelection || activeSelection.dayIndex !== dayIndex) return null
    return { top: activeSelection.startSlot * SLOT_HEIGHT, height: (activeSelection.endSlot - activeSelection.startSlot) * SLOT_HEIGHT }
  }

  const selectionInfoForDay = (dayIndex: number) => {
    if (!activeSelection || activeSelection.dayIndex !== dayIndex) return null
    const sAt = buildDateFromSlot(weekStart, dayIndex, activeSelection.startSlot, startHour)
    const eAt = buildDateFromSlot(weekStart, dayIndex, activeSelection.endSlot, startHour)
    const minutes = Math.max(0, Math.round((eAt.getTime() - sAt.getTime()) / (60 * 1000)))
    const hours = Math.floor(minutes / 60); const restMinutes = minutes % 60
    const durationLabel = hours > 0 ? (restMinutes > 0 ? `${hours}時間${restMinutes}分` : `${hours}時間`) : `${restMinutes}分`
    return { rangeLabel: `${formatTimeLabel(sAt)} - ${formatTimeLabel(eAt)}`, durationLabel }
  }

  const taskSelectionForDay = (dayIndex: number) => {
    if (!taskDragContext || !taskDragCurrent || taskDragCurrent.dayIndex !== dayIndex) return null
    return { top: taskDragCurrent.slotIndex * SLOT_HEIGHT, height: taskDragContext.durationSlots * SLOT_HEIGHT }
  }

  const taskResizeSelectionForDay = (dayIndex: number) => {
    if (!taskResizeContext || !taskResizeCurrent || taskResizeContext.dayIndex !== dayIndex) return null
    const s = taskResizeContext.edge === "start" ? taskResizeCurrent.slotIndex : taskResizeContext.initialStartSlot
    const e = taskResizeContext.edge === "end" ? taskResizeCurrent.slotIndex : taskResizeContext.initialEndSlot
    if (e <= s) return null
    return { top: s * SLOT_HEIGHT, height: (e - s) * SLOT_HEIGHT }
  }

  const taskResizeSelectionInfoForDay = (dayIndex: number) => {
    if (!taskResizeContext || !taskResizeCurrent || taskResizeContext.dayIndex !== dayIndex) return null
    const s = taskResizeContext.edge === "start" ? taskResizeCurrent.slotIndex : taskResizeContext.initialStartSlot
    const e = taskResizeContext.edge === "end" ? taskResizeCurrent.slotIndex : taskResizeContext.initialEndSlot
    if (e <= s) return null
    const sAt = buildDateFromSlot(weekStart, dayIndex, s, startHour); const eAt = buildDateFromSlot(weekStart, dayIndex, e, startHour)
    const minutes = Math.max(0, Math.round((eAt.getTime() - sAt.getTime()) / (60 * 1000)))
    const hours = Math.floor(minutes / 60); const restMinutes = minutes % 60
    const durationLabel = hours > 0 ? (restMinutes > 0 ? `${hours}時間${restMinutes}分` : `${hours}時間`) : `${restMinutes}分`
    return { rangeLabel: `${formatTimeLabel(sAt)} - ${formatTimeLabel(eAt)}`, durationLabel }
  }

  const hourMarks = Array.from({ length: endHour - startHour + 1 }, (_, index) => startHour + index)

  if (!hasMounted) {
    return (
      <div className="space-y-5 tracking-tight">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-themed">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm font-medium text-muted-foreground">カレンダーを読み込み中です...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 tracking-tight">
      {/* Time range settings */}
      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={() => setShowTimeSettings(!showTimeSettings)} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-all hover:bg-secondary hover:text-foreground">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {startHour}:00 - {endHour}:00
        </button>
      </div>
      {showTimeSettings && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm animate-slide-up">
          <label className="text-xs font-bold text-muted-foreground">表示範囲:</label>
          <select value={startHour} onChange={(e) => { const v = parseInt(e.target.value, 10); if (v < endHour) setStartHour(v) }} className="rounded-lg border border-border bg-background px-2 py-1 text-xs font-medium">
            {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>)}
          </select>
          <span className="text-xs text-muted-foreground">〜</span>
          <select value={endHour} onChange={(e) => { const v = parseInt(e.target.value, 10); if (v > startHour) setEndHour(v) }} className="rounded-lg border border-border bg-background px-2 py-1 text-xs font-medium">
            {Array.from({ length: 25 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>).filter((_, i) => i > startHour)}
          </select>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-themed">
        <div className="min-w-215 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[64px_repeat(7,minmax(110px,1fr))] border-b border-border bg-secondary/50">
            <div className="border-r border-border px-2 py-3 text-center text-[10px] font-bold tracking-[0.15em] text-muted-foreground/60 uppercase">時刻</div>
            {weekDays.map((day, index) => {
              const checkIn = day.checkIn
              const checkInTime = checkIn ? formatTimeLabel(new Date(checkIn.time)) : "—"
              const checkOutTime = checkIn?.checkOutTime ? formatTimeLabel(new Date(checkIn.checkOutTime)) : "—"
              const isToday = toDayKey(new Date()) === day.key

              return (
                <div key={day.key} className={`border-r border-border px-3 py-3 last:border-r-0 ${isToday ? "bg-primary/5" : ""}`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold tabular-nums ${isToday ? "text-primary" : "text-foreground"}`}>
                      {new Intl.DateTimeFormat("ja-JP", { day: "2-digit" }).format(day.date)}
                    </span>
                    <span className={`text-[11px] font-semibold ${isToday ? "text-primary/70" : "text-muted-foreground"}`}>
                      {DAY_LABELS[index]}
                    </span>
                    {isToday && <span className="rounded-md bg-primary px-1.5 py-0.5 text-[9px] font-bold text-white">TODAY</span>}
                  </div>
                  <p className="mt-1 text-[10px] font-medium text-muted-foreground tabular-nums">出 {checkInTime} / 退 {checkOutTime}</p>
                  {checkIn ? (
                    <span className={`mt-1 inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-bold ${getCheckInStatusColor(checkIn.status)}`}>
                      {getCheckInStatusLabel(checkIn.status)} ({checkIn.pointsEarned >= 0 ? `+${checkIn.pointsEarned}` : checkIn.pointsEarned}pt)
                    </span>
                  ) : null}
                </div>
              )
            })}
          </div>

          {/* Grid Body */}
          <div className="grid grid-cols-[64px_repeat(7,minmax(110px,1fr))]">
            <div className="relative border-r border-border bg-secondary/30" style={{ height: totalHeight }}>
              {hourMarks.map((hour) => {
                const top = (hour - startHour) * 60 * PX_PER_MINUTE
                return (
                  <div key={hour} className="absolute left-0 right-0" style={{ top }}>
                    <span className="absolute w-full -translate-y-1/2 text-center text-[10px] font-semibold tabular-nums text-muted-foreground/60">{String(hour).padStart(2, "0")}:00</span>
                  </div>
                )
              })}
            </div>

            {weekDays.map((day) => {
              const daySelection = selectionForDay(day.index)
              const daySelectionInfo = selectionInfoForDay(day.index)
              const taskSelectionDay = taskSelectionForDay(day.index)
              const taskResizeSelectionDay = taskResizeSelectionForDay(day.index)
              const taskResizeSelectionInfo = taskResizeSelectionInfoForDay(day.index)
              const isToday = toDayKey(new Date()) === day.key
              const timePos = isToday ? getCurrentTimePosition(day.date, startHour, totalMinutes) : null

              return (
                <div
                  key={day.key}
                  className={`group/col relative select-none border-r border-border transition-colors last:border-r-0 ${isToday ? "bg-primary/[0.02]" : "bg-card hover:bg-background/50"}`}
                  style={{ height: totalHeight }}
                  onContextMenu={(event) => event.preventDefault()}
                  onMouseMove={(event) => {
                    if (!dragStart && !taskDragContext && !taskResizeContext) return
                    if (event.buttons === 0) return
                    event.preventDefault()
                    const rect = event.currentTarget.getBoundingClientRect()
                    const relativeY = clamp(event.clientY - rect.top, 0, totalHeight - 1)
                    if (dragStart && dragStart.dayIndex === day.index) {
                      const si = clamp(Math.floor(relativeY / SLOT_HEIGHT), 0, slotCount - 1)
                      setDragCurrent((c) => { if (c && c.dayIndex === day.index && c.slotIndex === si) return c; return { dayIndex: day.index, slotIndex: si } })
                    }
                    if (taskDragContext) {
                      const si = clamp(Math.floor(relativeY / SLOT_HEIGHT), 0, slotCount - taskDragContext.durationSlots)
                      setTaskDragCurrent((c) => {
                        if (c && c.dayIndex === day.index && c.slotIndex === si) return c
                        if (si !== taskDragContext.initialSlotIndex || day.index !== taskDragContext.initialDayIndex) setDidTaskDragMove(true)
                        return { dayIndex: day.index, slotIndex: si }
                      })
                    }
                    if (taskResizeContext) {
                      if (day.index !== taskResizeContext.dayIndex) return
                      const baseSlot = Math.floor(relativeY / SLOT_HEIGHT)
                      if (taskResizeContext.edge === "start") {
                        const si = clamp(baseSlot, 0, taskResizeContext.initialEndSlot - 1)
                        setTaskResizeCurrent((c) => { if (c && c.dayIndex === day.index && c.slotIndex === si) return c; return { dayIndex: day.index, slotIndex: si } })
                      } else {
                        const si = clamp(baseSlot + 1, taskResizeContext.initialStartSlot + 1, slotCount)
                        setTaskResizeCurrent((c) => { if (c && c.dayIndex === day.index && c.slotIndex === si) return c; return { dayIndex: day.index, slotIndex: si } })
                      }
                    }
                  }}
                  onMouseUp={(event) => {
                    event.preventDefault()
                    if (dragStart && dragStart.dayIndex === day.index) finalizeSelection()
                    if (taskDragContext) finalizeTaskSelection()
                    if (taskResizeContext) finalizeTaskResizeSelection()
                  }}
                >
                  {/* Grid lines */}
                  {Array.from({ length: slotCount + 1 }, (_, si) => (
                    <div key={si} className={`absolute left-0 right-0 border-t ${si % 2 === 0 ? "border-border" : "border-border/40"}`} style={{ top: si * SLOT_HEIGHT }} />
                  ))}

                  {/* Current time line */}
                  {timePos != null && (
                    <div className="absolute left-0 right-0 z-30 pointer-events-none" style={{ top: timePos }}>
                      <div className="relative flex items-center">
                        <div className="h-2.5 w-2.5 rounded-full bg-destructive shadow-sm -ml-1" />
                        <div className="flex-1 h-[2px] bg-destructive/80" />
                      </div>
                    </div>
                  )}

                  {/* Tasks */}
                  {day.tasks.map((task) => {
                    const startMinute = getMinutesFromWindowStart(task.startDate, task.startDate, startHour)
                    const endMinute = getMinutesFromWindowStart(task.endDate, task.startDate, startHour)
                    const clampedStart = clamp(startMinute, 0, totalMinutes)
                    const clampedEnd = clamp(endMinute, 0, totalMinutes)
                    if (clampedEnd <= clampedStart) return null
                    const top = clampedStart * PX_PER_MINUTE
                    const height = Math.max((clampedEnd - clampedStart) * PX_PER_MINUTE, 22)
                    const isDone = task.status === "DONE"
                    const isGhost = taskDragContext?.taskId === task.id || taskResizeContext?.taskId === task.id

                    return (
                      <article
                        key={task.id}
                        onDragStart={(e) => e.preventDefault()}
                        onClick={() => {
                          if (suppressNextTaskClickRef.current) { suppressNextTaskClickRef.current = false; return }
                          if (didTaskDragMove) { setDidTaskDragMove(false); return }
                          openEditModal(task)
                        }}
                        onMouseDown={(event) => {
                          if (event.button !== 0) return
                          if ((event.target as HTMLElement).dataset.resizeHandle === "true") return
                          if ((event.target as HTMLElement).dataset.statusToggle === "true") return
                          event.preventDefault(); event.stopPropagation()
                          suppressPostDragClickRef.current = true
                          const durationSlots = Math.ceil((task.endDate.getTime() - task.startDate.getTime()) / (60 * 1000 * SLOT_MINUTES))
                          const initialSlotIndex = clamp(Math.floor(startMinute / SLOT_MINUTES), 0, slotCount - 1)
                          setDidTaskDragMove(false)
                          setTaskDragContext({ taskId: task.id, durationSlots, initialDayIndex: day.index, initialSlotIndex })
                          setTaskDragCurrent({ dayIndex: day.index, slotIndex: initialSlotIndex })
                        }}
                        className={`pointer-events-auto absolute left-1.5 right-1.5 z-40 cursor-pointer overflow-hidden rounded-[10px] border-l-[3px] shadow-sm transition-all duration-200 hover:shadow-themed hover:-translate-y-0.5 hover:brightness-[1.02] ${isDone ? "border-l-[var(--task-done-bar)] border border-accent/20 bg-gradient-to-r from-accent/[0.06] to-accent/[0.02]" : "border-l-[var(--task-todo-bar)] border border-primary/15 bg-gradient-to-r from-primary/[0.06] to-card"} ${isGhost ? "opacity-25 scale-95" : ""}`}
                        style={{ top, height }}
                      >
                        <button type="button" data-resize-handle="true" aria-label="開始時刻を調整" className="absolute inset-x-1 -top-1 z-20 h-2.5 cursor-ns-resize rounded-full bg-transparent" onClick={(e) => { e.preventDefault(); e.stopPropagation() }} onMouseDown={(event) => { if (event.button !== 0) return; event.preventDefault(); event.stopPropagation(); suppressNextTaskClickRef.current = true; suppressPostDragClickRef.current = true; const ss = clamp(Math.floor(startMinute / SLOT_MINUTES), 0, slotCount - 1); const es = clamp(Math.ceil(endMinute / SLOT_MINUTES), ss + 1, slotCount); setTaskResizeContext({ taskId: task.id, edge: "start", dayIndex: day.index, initialStartSlot: ss, initialEndSlot: es }); setTaskResizeCurrent({ dayIndex: day.index, slotIndex: ss }) }} />
                        <div className="flex items-start gap-1.5 px-2 py-1.5">
                          <button type="button" data-status-toggle="true" onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleTaskStatus(task.id, task.status) }} className={`mt-px flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[4px] border-[1.5px] transition-all duration-200 ${isDone ? "border-accent bg-accent text-white shadow-sm" : "border-muted-foreground/25 bg-white hover:border-primary hover:bg-primary/5"}`}>
                            {isDone && <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className={`truncate text-[11px] font-semibold leading-tight ${isDone ? "text-muted-foreground/60 line-through" : "text-foreground"}`}>{task.title}</p>
                            {height >= 36 && <p className="mt-0.5 truncate text-[10px] font-medium text-muted-foreground/50 tabular-nums">{toDurationLabel(task.startDate, task.endDate)}</p>}
                          </div>
                        </div>
                        <button type="button" data-resize-handle="true" aria-label="終了時刻を調整" className="absolute inset-x-1 -bottom-1 z-20 h-2.5 cursor-ns-resize rounded-full bg-transparent" onClick={(e) => { e.preventDefault(); e.stopPropagation() }} onMouseDown={(event) => { if (event.button !== 0) return; event.preventDefault(); event.stopPropagation(); suppressNextTaskClickRef.current = true; suppressPostDragClickRef.current = true; const ss = clamp(Math.floor(startMinute / SLOT_MINUTES), 0, slotCount - 1); const es = clamp(Math.ceil(endMinute / SLOT_MINUTES), ss + 1, slotCount); setTaskResizeContext({ taskId: task.id, edge: "end", dayIndex: day.index, initialStartSlot: ss, initialEndSlot: es }); setTaskResizeCurrent({ dayIndex: day.index, slotIndex: es }) }} />
                      </article>
                    )
                  })}

                  {/* Selection overlay */}
                  {daySelection ? (
                    <div className="pointer-events-none absolute left-1 right-1 z-20 rounded-lg border-2 border-primary/60 bg-primary/10 shadow-lg" style={{ top: daySelection.top, height: daySelection.height }}>
                      {daySelectionInfo ? (<div className="absolute left-1/2 top-1 -translate-x-1/2 rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold text-white whitespace-nowrap shadow-sm">{daySelectionInfo.rangeLabel} ({daySelectionInfo.durationLabel})</div>) : null}
                    </div>
                  ) : null}
                  {taskSelectionDay ? (
                    <div className="pointer-events-none absolute left-1 right-1 z-30 rounded-lg border-2 border-primary/60 bg-primary/10 shadow-lg flex items-center justify-center" style={{ top: taskSelectionDay.top, height: taskSelectionDay.height }}>
                      <p className="rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold text-white whitespace-nowrap shadow-sm">{toDurationLabel(buildDateFromSlot(weekStart, taskDragCurrent?.dayIndex || 0, taskDragCurrent?.slotIndex || 0, startHour), new Date(buildDateFromSlot(weekStart, taskDragCurrent?.dayIndex || 0, taskDragCurrent?.slotIndex || 0, startHour).getTime() + (taskDragContext?.durationSlots || 0) * SLOT_MINUTES * 60 * 1000))}</p>
                    </div>
                  ) : null}
                  {taskResizeSelectionDay ? (
                    <div className="pointer-events-none absolute left-1 right-1 z-30 rounded-lg border-2 border-primary/60 bg-primary/10 shadow-lg" style={{ top: taskResizeSelectionDay.top, height: taskResizeSelectionDay.height }}>
                      {taskResizeSelectionInfo ? (<div className="absolute left-1/2 top-1 -translate-x-1/2 rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold text-white whitespace-nowrap shadow-sm">{taskResizeSelectionInfo.rangeLabel} ({taskResizeSelectionInfo.durationLabel})</div>) : null}
                    </div>
                  ) : null}

                  {/* Invisible slot buttons */}
                  <div className="absolute inset-0 z-5 grid" style={{ gridTemplateRows: `repeat(${slotCount}, minmax(0, 1fr))` }}>
                    {Array.from({ length: slotCount }, (_, si) => (
                      <button key={si} type="button" draggable={false} className="cursor-crosshair border-0 bg-transparent p-0" aria-label={`slot-${day.index}-${si}`} onClick={(e) => { e.preventDefault(); e.stopPropagation() }} onMouseDown={(event) => { if (taskDragContext || taskResizeContext) return; if (event.button !== 0 && event.button !== 2) return; event.preventDefault(); event.stopPropagation(); suppressPostDragClickRef.current = true; setDragStart({ dayIndex: day.index, slotIndex: si }); setDragCurrent({ dayIndex: day.index, slotIndex: si }) }} onContextMenu={(e) => e.preventDefault()} onMouseEnter={() => { if (dragStart && dragStart.dayIndex === day.index) setDragCurrent({ dayIndex: day.index, slotIndex: si }); if (taskDragContext) setTaskDragCurrent({ dayIndex: day.index, slotIndex: Math.min(si, slotCount - taskDragContext.durationSlots) }); if (taskResizeContext && day.index === taskResizeContext.dayIndex) { if (taskResizeContext.edge === "start") setTaskResizeCurrent({ dayIndex: day.index, slotIndex: Math.min(si, taskResizeContext.initialEndSlot - 1) }); else setTaskResizeCurrent({ dayIndex: day.index, slotIndex: Math.max(si + 1, taskResizeContext.initialStartSlot + 1) }) } }} onMouseUp={(e) => { e.preventDefault(); if (dragStart && dragStart.dayIndex === day.index) finalizeSelection(); if (taskDragContext) finalizeTaskSelection(); if (taskResizeContext) finalizeTaskResizeSelection() }} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Modal */}
      {selectedRange || editingTask ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <button type="button" className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={closeModal} aria-label="close-modal-bg" />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-themed-lg animate-scale-in sm:p-8">
            <div className="mb-5">
              <p className="text-lg font-bold tracking-tight text-foreground">{editingTask ? "タスクを編集" : "タスクを作成"}</p>
              {selectedRange ? (<p className="mt-1 text-sm font-medium text-muted-foreground">{new Intl.DateTimeFormat("ja-JP", { month: "2-digit", day: "2-digit", weekday: "short" }).format(selectedRange.startAt)} {toDurationLabel(selectedRange.startAt, selectedRange.endAt)}</p>) : null}
            </div>
            <form onSubmit={editingTask ? handleScheduledUpdate : handleScheduledCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="calendar-task-title" className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground/70 uppercase">タスク名</label>
                <input id="calendar-task-title" value={title} onChange={(e) => setTitle(e.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm font-medium shadow-none outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/20" maxLength={120} required autoFocus />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="calendar-task-description" className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground/70 uppercase">詳細（任意）</label>
                <textarea id="calendar-task-description" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-20 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium shadow-none outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary/40 focus:ring-2 focus:ring-primary/20" maxLength={300} />
              </div>
              {editingTask ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="calendar-task-start" className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground/70 uppercase">開始時刻</label>
                    <input id="calendar-task-start" type="datetime-local" value={startAtInput} onChange={(e) => setStartAtInput(e.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium shadow-none outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="calendar-task-end" className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground/70 uppercase">終了時刻</label>
                    <input id="calendar-task-end" type="datetime-local" value={endAtInput} onChange={(e) => setEndAtInput(e.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium shadow-none outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="calendar-task-hours" className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground/70 uppercase">見積時間 (h)</label>
                  <input id="calendar-task-hours" type="number" min={0.5} max={24} step={0.5} value={estimatedHours} onChange={(e) => { const next = Number(e.target.value); setEstimatedHours(Number.isFinite(next) ? Math.max(0.5, Math.min(24, next)) : 0.5) }} className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm font-medium shadow-none outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/20" />
                </div>
                {editingTask ? (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground/70 uppercase">ステータス</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button type="button" onClick={() => setStatus("TODO")} className={`rounded-lg py-2 text-xs font-bold transition-all ${status === "TODO" ? "bg-primary/10 text-primary border border-primary/30 shadow-sm" : "bg-background text-muted-foreground border border-border hover:bg-secondary"}`}>未完了</button>
                      <button type="button" onClick={() => setStatus("DONE")} className={`rounded-lg py-2 text-xs font-bold transition-all ${status === "DONE" ? "bg-accent/10 text-accent border border-accent/30 shadow-sm" : "bg-background text-muted-foreground border border-border hover:bg-secondary"}`}>完了</button>
                    </div>
                  </div>
                ) : null}
              </div>
              {message ? (<p className={`text-xs font-medium ${isError ? "text-destructive" : "text-accent"}`}>{message}</p>) : null}
              <div className="flex items-center justify-end gap-2 pt-2">
                {editingTask ? (
                  <button type="button" onClick={handleTaskDelete} disabled={isDeleting || isSubmitting} className="mr-auto flex items-center gap-1.5 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive transition-all hover:bg-destructive/20 disabled:opacity-50">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    {isDeleting ? "削除中..." : "削除"}
                  </button>
                ) : null}
                <button type="button" onClick={closeModal} className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary">キャンセル</button>
                <button type="submit" disabled={isSubmitting || isDeleting} className="rounded-xl gradient-primary px-5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:shadow-themed disabled:opacity-50">{isSubmitting ? (editingTask ? "保存中..." : "作成中...") : editingTask ? "保存" : "作成"}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
