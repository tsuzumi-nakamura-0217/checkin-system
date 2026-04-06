"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ParticipationState = {
  hasActiveGoal: boolean
  isJoined: boolean
}

type MissionParticipationQuickActionProps = {
  embedded?: boolean
}

export function MissionParticipationQuickAction({ embedded = false }: MissionParticipationQuickActionProps) {
  const router = useRouter()
  const [state, setState] = useState<ParticipationState | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchState = useCallback(async () => {
    const res = await fetch("/api/community/participation", { cache: "no-store" })
    if (!res.ok) {
      throw new Error("failed to fetch participation")
    }

    const data = await res.json()
    setState({
      hasActiveGoal: Boolean(data.hasActiveGoal),
      isJoined: Boolean(data.isJoined),
    })
  }, [])

  useEffect(() => {
    fetchState().catch(() => {
      setState({ hasActiveGoal: false, isJoined: false })
    })
  }, [fetchState])

  const handleToggle = async () => {
    if (!state?.hasActiveGoal) return

    setIsSubmitting(true)
    try {
      const method = state.isJoined ? "DELETE" : "POST"
      const res = await fetch("/api/community/participation", { method })

      if (!res.ok) {
        throw new Error("failed to update participation")
      }

      await fetchState()
      router.refresh()
    } catch (error) {
      console.error("Failed to toggle mission participation:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!state?.hasActiveGoal) {
    return null
  }

  return (
    <section className={cn(!embedded && "rounded-2xl border border-border bg-card px-4 py-3 shadow-sm")}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-medium text-muted-foreground">
          ミッションへの参加状態をここから切り替えできます。
        </p>
        <Button
          size="sm"
          variant={state.isJoined ? "outline" : "default"}
          onClick={handleToggle}
          disabled={isSubmitting}
          className={cn(
            "min-w-36 rounded-xl font-bold",
            !state.isJoined && "gradient-primary shadow-themed-primary"
          )}
        >
          {isSubmitting
            ? "更新中..."
            : state.isJoined
              ? "ミッション参加中（離脱）"
              : "ミッションに参加する"}
        </Button>
      </div>
    </section>
  )
}
