import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/current-user"
import { updateCommunityStreak } from "@/lib/community-utils"

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Update login streak if there's an active LOGIN_STREAK goal
    await updateCommunityStreak(user.id, "LOGIN")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in community streak endpoint:", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
