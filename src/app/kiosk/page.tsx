import { KioskClient } from "./kiosk-client"

export const metadata = {
  title: "研究室キオスク",
}

export default function KioskPage() {
  const kioskToken = process.env.KIOSK_TOKEN ?? ""
  return <KioskClient kioskToken={kioskToken} />
}
