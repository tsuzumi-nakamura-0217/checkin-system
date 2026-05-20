import { headers } from "next/headers"

import { getClientIp, isLabNetwork } from "@/lib/location-validator"

import { KioskClient } from "./kiosk-client"

export const metadata = {
  title: "研究室キオスク",
}

export const dynamic = "force-dynamic"

export default async function KioskPage() {
  const headersList = await headers()
  const clientIp = getClientIp(headersList)
  const allowed = isLabNetwork(clientIp)

  if (!allowed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg className="h-9 w-9 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008zM5.25 4.5h13.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 17.25V6.75A2.25 2.25 0 015.25 4.5z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground">アクセス権限がありません</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          このキオスク画面は研究室の指定ネットワークからのみ利用できます。研究室のWi-Fiに接続してから再度お試しください。
        </p>
        {clientIp && (
          <p className="text-xs text-muted-foreground">接続元 IP: {clientIp}</p>
        )}
      </div>
    )
  }

  return <KioskClient />
}
