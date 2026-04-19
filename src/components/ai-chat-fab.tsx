"use client"

import { useEffect, useState } from "react"
import { MessageSquare } from "lucide-react"

import { AiChatPanel } from "@/components/ai-chat-panel"
import { cn } from "@/lib/utils"

export function AiChatFab() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open])

  return (
    <>
      <button
        type="button"
        aria-label="AIチャットを開く"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed right-4 bottom-20 z-68 flex h-13 items-center gap-2 rounded-full border border-primary/35 gradient-primary px-4 text-sm font-semibold text-primary-foreground shadow-themed-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] lg:right-6 lg:bottom-6",
          open ? "pointer-events-none translate-y-2 opacity-0" : "translate-y-0 opacity-100"
        )}
      >
        <MessageSquare className="h-4 w-4" />
        AIチャット
      </button>

      <div
        className={cn(
          "fixed inset-0 z-70 transition-opacity duration-250",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        <button
          type="button"
          aria-label="AIチャットを閉じる"
          onClick={() => setOpen(false)}
          className="absolute inset-0 bg-foreground/18 backdrop-blur-[1px]"
        />
      </div>

      <aside
        className={cn(
          "fixed top-0 right-0 z-71 h-dvh w-full max-w-[min(100vw,460px)] border-l border-border bg-card shadow-themed-lg transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full"
        )}
        aria-hidden={!open}
      >
        <AiChatPanel mode="sidebar" onClose={() => setOpen(false)} className="h-full" />
      </aside>
    </>
  )
}
