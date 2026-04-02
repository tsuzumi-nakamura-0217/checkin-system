"use client"

import { signOut } from "next-auth/react"
import { ReactNode } from "react"

export function LogoutButton({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (window.confirm("ログアウトしますか？")) {
          signOut({ callbackUrl: "/login" })
        }
      }}
      className={className}
      title="ログアウト"
      aria-label="ログアウト"
    >
      {children}
    </button>
  )
}
