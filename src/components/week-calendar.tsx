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
const START_HOUR = 6
const END_HOUR = 24
const SLOT_COUNT = ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES
const SLOT_HEIGHT = 24
const PX_PER_MINUTE = SLOT_HEIGHT / SLOT_MINUTES
const TOTAL_HEIGHT = SLOT_COUNT * SLOT_HEIGHT
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60

const DAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"] as const

function addDays(base: Date, days: number): Date {
  const date = new Date(base)
  date.setDate(date.getDate() + days)
  return date
}

function getCheckInStatusLabel(status: string): string {
  if (status === "EARLY") return "早着"
  if (status === "LATE") return "遅刻"
  if (status === "ON_TIME") return "時間内"
  return status
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function getMinutesFromWindowStart(date: Date, dayReference: Date): number {
  const windowStart = new Date(dayReference)
  windowStart.setHours(START_HOUR, 0, 0, 0)
  return Math.round((date.getTime() - windowStart.getTime()) / (60 * 1000))
}

function buildDateFromSlot(weekStart: Date, dayIndex: number, slotIndex: number): Date {
  const date = addDays(weekStart, dayIndex)
  date.setHours(START_HOUR, 0, 0, 0)
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
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed
}

export function WeekCalendar({ weekStartIso, tasks, checkIns }: WeekCalendarProps) {
  const router = useRouter()
  const suppressNextTaskClickRef = useRef(false)
  const suppressPostDragClickRef = useRef(false)
  const [hasMounted, setHasMounted] = useState(false)

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

  useEffect(() => {
    setHasMounted(true)
  }, [])

  const [localTasks, setLocalTasks] = useState<CalendarTask[]>(tasks)

  useEffect(() => {
    setLocalTasks(tasks)
  }, [tasks])

  const weekStart = useMemo(() => new Date(weekStartIso), [weekStartIso])

  const checkInByDay = useMemo(() => {
    const map = new Map<string, CalendarCheckIn>()

    for (const checkIn of checkIns) {
      const time = new Date(checkIn.time)
      if (Number.isNaN(time.getTime())) continue
      const key = toDayKey(time)
      if (!map.has(key)) {
        map.set(key, checkIn)
      }
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
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = addDays(weekStart, index)
        const key = toDayKey(date)
        return {
          index,
          date,
          key,
          checkIn: checkInByDay.get(key) ?? null,
          tasks: tasksByDay.get(key) ?? [],
        }
      }),
    [checkInByDay, tasksByDay, weekStart]
  )

  const activeSelection = useMemo(() => {
    if (!dragStart || !dragCurrent) return null
    if (dragStart.dayIndex !== dragCurrent.dayIndex) return null

    const startSlot = Math.min(dragStart.slotIndex, dragCurrent.slotIndex)
    const endSlot = Math.max(dragStart.slotIndex, dragCurrent.slotIndex) + 1

    return {
      dayIndex: dragStart.dayIndex,
      startSlot,
      endSlot,
    }
  }, [dragCurrent, dragStart])

  const closeModal = () => {
    setSelectedRange(null)
    setEditingTask(null)
    setTitle("")
    setDescription("")
    setEstimatedHours(1)
    setStatus("TODO")
    setStartAtInput("")
    setEndAtInput("")
    setIsDeleting(false)
    setMessage(null)
    setIsError(false)
  }

  const openEditModal = (task: ScheduledCalendarTask) => {
    setSelectedRange(null)
    setEditingTask({
      taskId: task.id,
      originalStatus: task.status === "DONE" ? "DONE" : "TODO",
    })
    setTitle(task.title)
    setDescription(task.description ?? "")
    setEstimatedHours(task.estimatedHours)
    setStatus(task.status === "DONE" ? "DONE" : "TODO")
    setStartAtInput(toDateTimeLocalValue(task.startDate))
    setEndAtInput(toDateTimeLocalValue(task.endDate))
    setMessage(null)
    setIsError(false)
  }

  const updateTaskRange = useCallback(
    async (taskId: string, startAt: Date, endAt: Date) => {
      setLocalTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, startAt: startAt.toISOString(), endAt: endAt.toISOString() }
            : t
        )
      )

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error("タスクの更新に失敗しました。")
      }
    },
    []
  )

  const finalizeSelection = useCallback(() => {
    if (!activeSelection) {
      setDragStart(null)
      setDragCurrent(null)
      window.setTimeout(() => {
        suppressPostDragClickRef.current = false
      }, 0)
      return
    }

    const startAt = buildDateFromSlot(weekStart, activeSelection.dayIndex, activeSelection.startSlot)
    const endAt = buildDateFromSlot(weekStart, activeSelection.dayIndex, activeSelection.endSlot)

    const diffHours = Math.max(1, Math.ceil((endAt.getTime() - startAt.getTime()) / (60 * 60 * 1000)))

    setSelectedRange({ startAt, endAt })
    setEditingTask(null)
    setTitle("")
    setDescription("")
    setStatus("TODO")
    setStartAtInput("")
    setEndAtInput("")
    setEstimatedHours(diffHours)
    setDragStart(null)
    setDragCurrent(null)
    setMessage(null)
    setIsError(false)
    window.setTimeout(() => {
      suppressPostDragClickRef.current = false
    }, 0)
  }, [activeSelection, weekStart])

  const finalizeTaskSelection = useCallback(async () => {
    if (!taskDragContext || !taskDragCurrent) {
      setTaskDragContext(null)
      setTaskDragCurrent(null)
      setDidTaskDragMove(false)
      window.setTimeout(() => {
        suppressPostDragClickRef.current = false
      }, 0)
      return
    }

    const { taskId, durationSlots } = taskDragContext
    const { dayIndex, slotIndex } = taskDragCurrent

    setTaskDragContext(null)
    setTaskDragCurrent(null)

    if (taskDragContext.initialDayIndex === dayIndex && taskDragContext.initialSlotIndex === slotIndex) {
      setDidTaskDragMove(false)
      window.setTimeout(() => {
        suppressPostDragClickRef.current = false
      }, 0)
      return
    }

    const newStart = buildDateFromSlot(weekStart, dayIndex, slotIndex)
    const newEnd = new Date(newStart.getTime() + durationSlots * SLOT_MINUTES * 60 * 1000)

    try {
      await updateTaskRange(taskId, newStart, newEnd)
      router.refresh()
    } catch {
      alert("エラーが発生しました。")
    } finally {
      setDidTaskDragMove(false)
      window.setTimeout(() => {
        suppressPostDragClickRef.current = false
      }, 0)
    }
  }, [taskDragContext, taskDragCurrent, weekStart, router, updateTaskRange])

  const finalizeTaskResizeSelection = useCallback(async () => {
    if (!taskResizeContext || !taskResizeCurrent) {
      setTaskResizeContext(null)
      setTaskResizeCurrent(null)
      window.setTimeout(() => {
        suppressPostDragClickRef.current = false
      }, 0)
      return
    }

    const { taskId, dayIndex, edge, initialStartSlot, initialEndSlot } = taskResizeContext
    const resizedSlot = taskResizeCurrent.slotIndex

    setTaskResizeContext(null)
    setTaskResizeCurrent(null)

    const nextStartSlot = edge === "start" ? resizedSlot : initialStartSlot
    const nextEndSlot = edge === "end" ? resizedSlot : initialEndSlot

    if (nextEndSlot - nextStartSlot < 1) {
      window.setTimeout(() => {
        suppressPostDragClickRef.current = false
      }, 0)
      return
    }

    if (nextStartSlot === initialStartSlot && nextEndSlot === initialEndSlot) {
      window.setTimeout(() => {
        suppressPostDragClickRef.current = false
      }, 0)
      return
    }

    const newStart = buildDateFromSlot(weekStart, dayIndex, nextStartSlot)
    const newEnd = buildDateFromSlot(weekStart, dayIndex, nextEndSlot)

    try {
      await updateTaskRange(taskId, newStart, newEnd)
      router.refresh()
    } catch {
      alert("エラーが発生しました。")
    } finally {
      // Resize drag end can emit a synthetic click. Clear the one-shot guard after that event turn.
      window.setTimeout(() => {
        suppressNextTaskClickRef.current = false
        suppressPostDragClickRef.current = false
      }, 0)
    }
  }, [taskResizeContext, taskResizeCurrent, weekStart, router, updateTaskRange])

  useEffect(() => {
    const handleClickCapture = (event: MouseEvent) => {
      if (!suppressPostDragClickRef.current) return
      event.preventDefault()
      event.stopPropagation()
      suppressPostDragClickRef.current = false
    }

    window.addEventListener("click", handleClickCapture, true)

    return () => {
      window.removeEventListener("click", handleClickCapture, true)
    }
  }, [])

  useEffect(() => {
    const handleMouseUp = () => {
      if (dragStart) finalizeSelection()
      if (taskDragContext) finalizeTaskSelection()
      if (taskResizeContext) finalizeTaskResizeSelection()
    }

    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [
    dragStart,
    finalizeSelection,
    taskDragContext,
    finalizeTaskSelection,
    taskResizeContext,
    finalizeTaskResizeSelection,
  ])

  const handleScheduledUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!editingTask) return

    const parsedStartAt = parseLocalDateTime(startAtInput)
    const parsedEndAt = parseLocalDateTime(endAtInput)

    if (!title.trim()) {
      setIsError(true)
      setMessage("タスク名は必須です。")
      return
    }

    if (!parsedStartAt || !parsedEndAt) {
      setIsError(true)
      setMessage("開始時刻と終了時刻を正しく入力してください。")
      return
    }

    if (parsedEndAt <= parsedStartAt) {
      setIsError(true)
      setMessage("終了時刻は開始時刻より後にしてください。")
      return
    }

    setIsSubmitting(true)
    setMessage(null)
    setIsError(false)

    try {
      const updateResponse = await fetch(`/api/tasks/${editingTask.taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          estimatedHours,
          startAt: parsedStartAt.toISOString(),
          endAt: parsedEndAt.toISOString(),
        }),
      })

      const updateData = (await updateResponse.json().catch(() => null)) as
        | { success: true }
        | { success: false; error?: string }
        | null

      if (!updateResponse.ok || !updateData?.success) {
        const errorText = updateData && !updateData.success ? updateData.error : "タスク更新に失敗しました。"
        throw new Error(errorText || "タスク更新に失敗しました。")
      }

      if (status !== editingTask.originalStatus) {
        const statusResponse = await fetch(`/api/tasks/${editingTask.taskId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        })

        const statusData = (await statusResponse.json().catch(() => null)) as
          | { success: true }
          | { success: false; error?: string }
          | null

        if (!statusResponse.ok || !statusData?.success) {
          const errorText = statusData && !statusData.success ? statusData.error : "ステータス更新に失敗しました。"
          throw new Error(errorText || "ステータス更新に失敗しました。")
        }
      }

      closeModal()
      router.refresh()
    } catch (error) {
      setIsError(true)
      setMessage(error instanceof Error ? error.message : "タスク更新に失敗しました。")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTaskDelete = async () => {
    if (!editingTask) return
    if (!window.confirm("このタスクを削除しますか？")) return

    setIsDeleting(true)
    setMessage(null)
    setIsError(false)

    try {
      const response = await fetch(`/api/tasks/${editingTask.taskId}`, {
        method: "DELETE",
      })

      const data = (await response.json().catch(() => null)) as
        | { success: true }
        | { success: false; error?: string }
        | null

      if (!response.ok || !data?.success) {
        const errorText = data && !data.success ? data.error : "削除に失敗しました。"
        throw new Error(errorText || "削除に失敗しました。")
      }

      closeModal()
      router.refresh()
    } catch (error) {
      setIsError(true)
      setMessage(error instanceof Error ? error.message : "削除に失敗しました。")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleScheduledCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedRange) return

    if (!title.trim()) {
      setIsError(true)
      setMessage("タスク名は必須です。")
      return
    }

    setIsSubmitting(true)
    setMessage(null)
    setIsError(false)

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          estimatedHours,
          startAt: selectedRange.startAt.toISOString(),
          endAt: selectedRange.endAt.toISOString(),
        }),
      })

      const data = (await response.json().catch(() => null)) as
        | { success: true }
        | { success: false; error?: string }
        | null

      if (!response.ok || !data?.success) {
        const errorText = data && !data.success ? data.error : "タスク作成に失敗しました。"
        throw new Error(errorText || "タスク作成に失敗しました。")
      }

      closeModal()
      router.refresh()
    } catch (error) {
      setIsError(true)
      setMessage(error instanceof Error ? error.message : "タスク作成に失敗しました。")
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectionForDay = (dayIndex: number) => {
    if (!activeSelection || activeSelection.dayIndex !== dayIndex) return null

    return {
      top: activeSelection.startSlot * SLOT_HEIGHT,
      height: (activeSelection.endSlot - activeSelection.startSlot) * SLOT_HEIGHT,
    }
  }

  const selectionInfoForDay = (dayIndex: number) => {
    if (!activeSelection || activeSelection.dayIndex !== dayIndex) return null

    const startAt = buildDateFromSlot(weekStart, dayIndex, activeSelection.startSlot)
    const endAt = buildDateFromSlot(weekStart, dayIndex, activeSelection.endSlot)
    const minutes = Math.max(0, Math.round((endAt.getTime() - startAt.getTime()) / (60 * 1000)))
    const hours = Math.floor(minutes / 60)
    const restMinutes = minutes % 60

    const durationLabel =
      hours > 0
        ? restMinutes > 0
          ? `${hours}時間${restMinutes}分`
          : `${hours}時間`
        : `${restMinutes}分`

    return {
      rangeLabel: `${formatTimeLabel(startAt)} - ${formatTimeLabel(endAt)}`,
      durationLabel,
    }
  }

  const taskSelectionForDay = (dayIndex: number) => {
    if (!taskDragContext || !taskDragCurrent || taskDragCurrent.dayIndex !== dayIndex) return null

    return {
      top: taskDragCurrent.slotIndex * SLOT_HEIGHT,
      height: taskDragContext.durationSlots * SLOT_HEIGHT,
    }
  }

  const taskResizeSelectionForDay = (dayIndex: number) => {
    if (!taskResizeContext || !taskResizeCurrent || taskResizeContext.dayIndex !== dayIndex) return null

    const startSlot = taskResizeContext.edge === "start" ? taskResizeCurrent.slotIndex : taskResizeContext.initialStartSlot
    const endSlot = taskResizeContext.edge === "end" ? taskResizeCurrent.slotIndex : taskResizeContext.initialEndSlot

    if (endSlot <= startSlot) return null

    return {
      top: startSlot * SLOT_HEIGHT,
      height: (endSlot - startSlot) * SLOT_HEIGHT,
    }
  }

  const taskResizeSelectionInfoForDay = (dayIndex: number) => {
    if (!taskResizeContext || !taskResizeCurrent || taskResizeContext.dayIndex !== dayIndex) return null

    const startSlot =
      taskResizeContext.edge === "start"
        ? taskResizeCurrent.slotIndex
        : taskResizeContext.initialStartSlot
    const endSlot =
      taskResizeContext.edge === "end"
        ? taskResizeCurrent.slotIndex
        : taskResizeContext.initialEndSlot

    if (endSlot <= startSlot) return null

    const startAt = buildDateFromSlot(weekStart, dayIndex, startSlot)
    const endAt = buildDateFromSlot(weekStart, dayIndex, endSlot)
    const minutes = Math.max(0, Math.round((endAt.getTime() - startAt.getTime()) / (60 * 1000)))
    const hours = Math.floor(minutes / 60)
    const restMinutes = minutes % 60

    const durationLabel =
      hours > 0
        ? restMinutes > 0
          ? `${hours}時間${restMinutes}分`
          : `${hours}時間`
        : `${restMinutes}分`

    return {
      rangeLabel: `${formatTimeLabel(startAt)} - ${formatTimeLabel(endAt)}`,
      durationLabel,
    }
  }

  const hourMarks = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, index) => START_HOUR + index)

  if (!hasMounted) {
    return (
      <div className="space-y-5 tracking-tight">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">カレンダーを読み込み中です...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 tracking-tight">
      <div className="overflow-x-auto rounded-[28px] border border-border bg-background p-2 shadow-sm">
        <div className="min-w-215 overflow-hidden rounded-[22px] border border-border bg-card">
          <div className="grid grid-cols-[72px_repeat(7,minmax(110px,1fr))] border-b border-border bg-secondary">
            <div className="border-r border-border px-2 py-4 text-center text-xs font-semibold tracking-wider text-muted-foreground uppercase">時刻</div>
            {weekDays.map((day, index) => {
              const checkIn = day.checkIn
              const checkInTime = checkIn ? formatTimeLabel(new Date(checkIn.time)) : "--:--"
              const checkOutTime = checkIn?.checkOutTime
                ? formatTimeLabel(new Date(checkIn.checkOutTime))
                : "--:--"

              return (
                <div key={day.key} className="border-r border-border px-3 py-4 last:border-r-0">
                  <p className="text-sm font-semibold tracking-tight text-foreground">
                    {new Intl.DateTimeFormat("ja-JP", {
                      month: "2-digit",
                      day: "2-digit",
                    }).format(day.date)}
                    <span className="ml-1 text-xs font-medium text-muted-foreground">({DAY_LABELS[index]})</span>
                  </p>
                  <p className="mt-1.5 text-[11px] font-medium tracking-wide text-muted-foreground">
                    出 {checkInTime} / 退 {checkOutTime}
                  </p>
                  {checkIn ? (
                    <p className="mt-1 inline-flex rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                      {getCheckInStatusLabel(checkIn.status)} ({checkIn.pointsEarned >= 0 ? `+${checkIn.pointsEarned}` : checkIn.pointsEarned}pt)
                    </p>
                  ) : null}
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-[72px_repeat(7,minmax(110px,1fr))]">
            <div className="relative border-r border-border bg-secondary" style={{ height: TOTAL_HEIGHT }}>
              {hourMarks.map((hour) => {
                const top = (hour - START_HOUR) * 60 * PX_PER_MINUTE
                return (
                  <div key={hour} className="absolute left-0 right-0" style={{ top }}>
                    <span className="absolute w-full -translate-y-1/2 text-center text-[11px] font-medium tracking-wider text-muted-foreground">{String(hour).padStart(2, "0")}:00</span>
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

              return (
                <div
                  key={day.key}
                  className="group/col relative select-none border-r border-border bg-card transition-colors hover:bg-background last:border-r-0"
                  style={{ height: TOTAL_HEIGHT }}
                  onContextMenu={(event) => event.preventDefault()}
                  onMouseMove={(event) => {
                    if (!dragStart && !taskDragContext && !taskResizeContext) return
                    if (event.buttons === 0) return

                    event.preventDefault()

                    const rect = event.currentTarget.getBoundingClientRect()
                    const relativeY = clamp(event.clientY - rect.top, 0, TOTAL_HEIGHT - 1)

                    if (dragStart && dragStart.dayIndex === day.index) {
                      const slotIndex = clamp(Math.floor(relativeY / SLOT_HEIGHT), 0, SLOT_COUNT - 1)
                      setDragCurrent((current) => {
                        if (current && current.dayIndex === day.index && current.slotIndex === slotIndex) return current
                        return { dayIndex: day.index, slotIndex }
                      })
                    }

                    if (taskDragContext) {
                      const slotIndex = clamp(Math.floor(relativeY / SLOT_HEIGHT), 0, SLOT_COUNT - taskDragContext.durationSlots)
                      setTaskDragCurrent((current) => {
                        if (current && current.dayIndex === day.index && current.slotIndex === slotIndex) return current
                        if (
                          slotIndex !== taskDragContext.initialSlotIndex ||
                          day.index !== taskDragContext.initialDayIndex
                        ) {
                          setDidTaskDragMove(true)
                        }
                        return { dayIndex: day.index, slotIndex }
                      })
                    }

                    if (taskResizeContext) {
                      if (day.index !== taskResizeContext.dayIndex) return

                      const baseSlot = Math.floor(relativeY / SLOT_HEIGHT)
                      if (taskResizeContext.edge === "start") {
                        const slotIndex = clamp(baseSlot, 0, taskResizeContext.initialEndSlot - 1)
                        setTaskResizeCurrent((current) => {
                          if (current && current.dayIndex === day.index && current.slotIndex === slotIndex) return current
                          return { dayIndex: day.index, slotIndex }
                        })
                        return
                      }

                      const slotIndex = clamp(baseSlot + 1, taskResizeContext.initialStartSlot + 1, SLOT_COUNT)
                      setTaskResizeCurrent((current) => {
                        if (current && current.dayIndex === day.index && current.slotIndex === slotIndex) return current
                        return { dayIndex: day.index, slotIndex }
                      })
                    }
                  }}
                  onMouseUp={(event) => {
                    event.preventDefault()
                    if (dragStart && dragStart.dayIndex === day.index) {
                      finalizeSelection()
                    }
                    if (taskDragContext) {
                      finalizeTaskSelection()
                    }
                    if (taskResizeContext) {
                      finalizeTaskResizeSelection()
                    }
                  }}
                >
                  {Array.from({ length: SLOT_COUNT + 1 }, (_, slotIndex) => (
                    <div
                      key={slotIndex}
                      className="absolute left-0 right-0 border-t border-border"
                      style={{ top: slotIndex * SLOT_HEIGHT }}
                    />
                  ))}

                  {day.tasks.map((task) => {
                    const startMinute = getMinutesFromWindowStart(task.startDate, task.startDate)
                    const endMinute = getMinutesFromWindowStart(task.endDate, task.startDate)
                    const clampedStart = clamp(startMinute, 0, TOTAL_MINUTES)
                    const clampedEnd = clamp(endMinute, 0, TOTAL_MINUTES)

                    if (clampedEnd <= clampedStart) return null

                    const top = clampedStart * PX_PER_MINUTE
                    const height = Math.max((clampedEnd - clampedStart) * PX_PER_MINUTE, 20)

                    return (
                      <article
                        key={task.id}
                        onDragStart={(event) => event.preventDefault()}
                        onClick={() => {
                          if (suppressNextTaskClickRef.current) {
                            suppressNextTaskClickRef.current = false
                            return
                          }
                          if (didTaskDragMove) {
                            setDidTaskDragMove(false)
                            return
                          }
                          openEditModal(task)
                        }}
                        onMouseDown={(event) => {
                          if (event.button !== 0) return
                          if ((event.target as HTMLElement).dataset.resizeHandle === "true") return
                          event.preventDefault()
                          event.stopPropagation()
                          suppressPostDragClickRef.current = true
                          const durationSlots = Math.ceil((task.endDate.getTime() - task.startDate.getTime()) / (60 * 1000 * SLOT_MINUTES))
                          const initialSlotIndex = clamp(Math.floor(startMinute / SLOT_MINUTES), 0, SLOT_COUNT - 1)
                          setDidTaskDragMove(false)
                          setTaskDragContext({
                            taskId: task.id,
                            durationSlots,
                            initialDayIndex: day.index,
                            initialSlotIndex
                          })
                          setTaskDragCurrent({ dayIndex: day.index, slotIndex: initialSlotIndex })
                        }}
                        className={`pointer-events-auto absolute left-1 right-1 z-40 cursor-pointer rounded-xl border px-2.5 py-1.5 text-[11px] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${task.status === "DONE" ? "border-muted bg-muted text-muted-foreground" : "border-border bg-background text-foreground"} ${taskDragContext?.taskId === task.id || taskResizeContext?.taskId === task.id ? "opacity-50" : ""}`}
                        style={{ top, height }}
                      >
                        <button
                          type="button"
                          data-resize-handle="true"
                          aria-label="開始時刻を調整"
                          className="absolute inset-x-2 -top-1 z-20 h-2 cursor-ns-resize rounded-full bg-transparent"
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                          }}
                          onMouseDown={(event) => {
                            if (event.button !== 0) return
                            event.preventDefault()
                            event.stopPropagation()
                            suppressNextTaskClickRef.current = true
                            suppressPostDragClickRef.current = true
                            const startSlot = clamp(Math.floor(startMinute / SLOT_MINUTES), 0, SLOT_COUNT - 1)
                            const endSlot = clamp(Math.ceil(endMinute / SLOT_MINUTES), startSlot + 1, SLOT_COUNT)
                            setTaskResizeContext({
                              taskId: task.id,
                              edge: "start",
                              dayIndex: day.index,
                              initialStartSlot: startSlot,
                              initialEndSlot: endSlot,
                            })
                            setTaskResizeCurrent({ dayIndex: day.index, slotIndex: startSlot })
                          }}
                        />
                        <p className="truncate font-semibold tracking-tight">{task.title}</p>
                        <p className="truncate font-medium text-muted-foreground">{toDurationLabel(task.startDate, task.endDate)}</p>
                        <button
                          type="button"
                          data-resize-handle="true"
                          aria-label="終了時刻を調整"
                          className="absolute inset-x-2 -bottom-1 z-20 h-2 cursor-ns-resize rounded-full bg-transparent"
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                          }}
                          onMouseDown={(event) => {
                            if (event.button !== 0) return
                            event.preventDefault()
                            event.stopPropagation()
                            suppressNextTaskClickRef.current = true
                            suppressPostDragClickRef.current = true
                            const startSlot = clamp(Math.floor(startMinute / SLOT_MINUTES), 0, SLOT_COUNT - 1)
                            const endSlot = clamp(Math.ceil(endMinute / SLOT_MINUTES), startSlot + 1, SLOT_COUNT)
                            setTaskResizeContext({
                              taskId: task.id,
                              edge: "end",
                              dayIndex: day.index,
                              initialStartSlot: startSlot,
                              initialEndSlot: endSlot,
                            })
                            setTaskResizeCurrent({ dayIndex: day.index, slotIndex: endSlot })
                          }}
                        />
                      </article>
                    )
                  })}

                  {daySelection ? (
                    <div
                      className="pointer-events-none absolute left-1 right-1 z-20 rounded-xl border border-foreground bg-card shadow-lg"
                      style={{ top: daySelection.top, height: daySelection.height }}
                    >
                      {daySelectionInfo ? (
                        <div className="absolute left-1/2 top-1 -translate-x-1/2 rounded-full bg-foreground px-2.5 py-0.5 text-[10px] font-semibold text-background whitespace-nowrap shadow-sm">
                          {daySelectionInfo.rangeLabel} ({daySelectionInfo.durationLabel})
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {taskSelectionDay ? (
                    <div
                      className="pointer-events-none absolute left-1 right-1 z-30 rounded-xl border border-foreground bg-card shadow-lg flex items-center justify-center"
                      style={{ top: taskSelectionDay.top, height: taskSelectionDay.height }}
                    >
                       <p className="rounded-full bg-foreground px-2.5 py-0.5 text-[10px] font-semibold text-background whitespace-nowrap shadow-sm">
                         {toDurationLabel(
                           buildDateFromSlot(weekStart, taskDragCurrent?.dayIndex || 0, taskDragCurrent?.slotIndex || 0),
                           new Date(buildDateFromSlot(weekStart, taskDragCurrent?.dayIndex || 0, taskDragCurrent?.slotIndex || 0).getTime() + (taskDragContext?.durationSlots || 0) * SLOT_MINUTES * 60 * 1000)
                         )}
                       </p>
                    </div>
                  ) : null}

                  {taskResizeSelectionDay ? (
                    <div
                      className="pointer-events-none absolute left-1 right-1 z-30 rounded-xl border border-foreground bg-card shadow-lg"
                      style={{ top: taskResizeSelectionDay.top, height: taskResizeSelectionDay.height }}
                    >
                      <div className="absolute left-0 right-0 top-0 h-[1px] bg-foreground" />
                      <div className="absolute left-0 right-0 bottom-0 h-[1px] bg-foreground" />
                      {taskResizeSelectionInfo ? (
                        <div className="absolute left-1/2 top-1 -translate-x-1/2 rounded-full bg-foreground px-2.5 py-0.5 text-[10px] font-semibold text-background whitespace-nowrap shadow-sm">
                          {taskResizeSelectionInfo.rangeLabel} ({taskResizeSelectionInfo.durationLabel})
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div
                    className="absolute inset-0 z-5 grid"
                    style={{ gridTemplateRows: `repeat(${SLOT_COUNT}, minmax(0, 1fr))` }}
                  >
                    {Array.from({ length: SLOT_COUNT }, (_, slotIndex) => (
                      <button
                        key={slotIndex}
                        type="button"
                        draggable={false}
                        className="cursor-crosshair border-0 bg-transparent p-0"
                        aria-label={`slot-${day.index}-${slotIndex}`}
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                        }}
                        onMouseDown={(event) => {
                          if (taskDragContext || taskResizeContext) return
                          if (event.button !== 0 && event.button !== 2) return
                          event.preventDefault()
                          event.stopPropagation()
                          suppressPostDragClickRef.current = true
                          setDragStart({ dayIndex: day.index, slotIndex })
                          setDragCurrent({ dayIndex: day.index, slotIndex })
                        }}
                        onContextMenu={(event) => event.preventDefault()}
                        onMouseEnter={() => {
                          if (dragStart && dragStart.dayIndex === day.index) {
                            setDragCurrent({ dayIndex: day.index, slotIndex })
                          }
                          if (taskDragContext) {
                            setTaskDragCurrent({ dayIndex: day.index, slotIndex: Math.min(slotIndex, SLOT_COUNT - taskDragContext.durationSlots) })
                          }
                          if (taskResizeContext && day.index === taskResizeContext.dayIndex) {
                            if (taskResizeContext.edge === "start") {
                              setTaskResizeCurrent({
                                dayIndex: day.index,
                                slotIndex: Math.min(slotIndex, taskResizeContext.initialEndSlot - 1),
                              })
                            } else {
                              setTaskResizeCurrent({
                                dayIndex: day.index,
                                slotIndex: Math.max(slotIndex + 1, taskResizeContext.initialStartSlot + 1),
                              })
                            }
                          }
                        }}
                        onMouseUp={(event) => {
                          event.preventDefault()
                          if (dragStart && dragStart.dayIndex === day.index) {
                            finalizeSelection()
                          }
                          if (taskDragContext) {
                            finalizeTaskSelection()
                          }
                          if (taskResizeContext) {
                            finalizeTaskResizeSelection()
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {selectedRange || editingTask ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-secondary transition-opacity"
            onClick={closeModal}
            aria-label="close-modal-bg"
          />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-lg sm:p-8">
            <div className="mb-6">
              <p className="text-lg font-semibold tracking-tight text-foreground">
                {editingTask ? "時間指定タスクを編集" : "時間指定タスクを作成"}
              </p>
              {selectedRange ? (
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  {new Intl.DateTimeFormat("ja-JP", {
                    month: "2-digit",
                    day: "2-digit",
                    weekday: "short",
                  }).format(selectedRange.startAt)} {toDurationLabel(selectedRange.startAt, selectedRange.endAt)}
                </p>
              ) : null}
            </div>

            <form onSubmit={editingTask ? handleScheduledUpdate : handleScheduledCreate} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="calendar-task-title" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">タスク名</label>
                <input
                  id="calendar-task-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-background px-4 text-base shadow-none outline-none transition-all focus:bg-background focus:ring-2 focus:ring-ring"
                  maxLength={120}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="calendar-task-description" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">詳細（任意）</label>
                <textarea
                  id="calendar-task-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="min-h-25 w-full rounded-xl border border-border bg-background px-4 py-3 text-base shadow-none outline-none transition-all placeholder:text-muted-foreground focus:bg-background focus:ring-2 focus:ring-ring"
                  maxLength={300}
                />
              </div>

              {editingTask ? (
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="calendar-task-start" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">開始時刻</label>
                    <input
                      id="calendar-task-start"
                      type="datetime-local"
                      value={startAtInput}
                      onChange={(event) => setStartAtInput(event.target.value)}
                      className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm shadow-none outline-none transition-all focus:bg-background focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="calendar-task-end" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">終了時刻</label>
                    <input
                      id="calendar-task-end"
                      type="datetime-local"
                      value={endAtInput}
                      onChange={(event) => setEndAtInput(event.target.value)}
                      className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm shadow-none outline-none transition-all focus:bg-background focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              ) : null}

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="calendar-task-hours" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">見積時間 (h)</label>
                  <input
                    id="calendar-task-hours"
                    type="number"
                    min={1}
                    max={24}
                    value={estimatedHours}
                    onChange={(event) => {
                      const next = Number(event.target.value)
                      setEstimatedHours(Number.isFinite(next) ? Math.max(1, Math.min(24, next)) : 1)
                    }}
                    className="h-12 w-full rounded-xl border border-border bg-background px-4 text-base shadow-none outline-none transition-all focus:bg-background focus:ring-2 focus:ring-ring"
                  />
                </div>

                {editingTask ? (
                  <div className="space-y-2">
                    <label htmlFor="calendar-task-status" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">ステータス</label>
                    <select
                      id="calendar-task-status"
                      value={status}
                      onChange={(event) => setStatus(event.target.value === "DONE" ? "DONE" : "TODO")}
                      className="h-12 w-full rounded-xl border border-border bg-background px-4 text-base shadow-none outline-none transition-all focus:bg-background focus:ring-2 focus:ring-ring"
                    >
                      <option value="TODO">未完了</option>
                      <option value="DONE">完了</option>
                    </select>
                  </div>
                ) : null}
              </div>

              {message ? (
                <p className={`text-xs ${isError ? "text-destructive" : "text-primary"}`}>{message}</p>
              ) : null}

              <div className="flex items-center justify-end gap-2 pt-1">
                {editingTask ? (
                  <button
                    type="button"
                    onClick={handleTaskDelete}
                    disabled={isDeleting || isSubmitting}
                    className="mr-auto rounded-full bg-destructive px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {isDeleting ? "削除中..." : "削除"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isDeleting}
                  className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:bg-muted"
                >
                  {isSubmitting ? (editingTask ? "保存中..." : "作成中...") : editingTask ? "保存" : "作成"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
