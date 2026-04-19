import { redirect } from "next/navigation"

import { AiChatPanel } from "@/components/ai-chat-panel"
import { getCurrentUser } from "@/lib/current-user"

export const metadata = {
  title: "AIチャット",
}

export default async function AiPage() {
  const currentUser = await getCurrentUser()

  if (!currentUser?.id) {
    redirect("/login")
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black tracking-tight text-foreground">AIチャット</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Gemini無料枠で、設定画面で再認証済みのGoogleアカウント情報を横断参照します。
        </p>
      </header>

      <AiChatPanel />
    </div>
  )
}
