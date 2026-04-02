import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/current-user"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser?.id) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: {
        id: true,
        targetTimeMon: true,
        targetTimeTue: true,
        targetTimeWed: true,
        targetTimeThu: true,
        targetTimeFri: true,
        targetTimeSat: true,
        targetTimeSun: true,
        checkInMon: true,
        checkInTue: true,
        checkInWed: true,
        checkInThu: true,
        checkInFri: true,
        checkInSat: true,
        checkInSun: true,
      },
    })

    if (!user) {
      return new NextResponse("User not found", { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("[SETTINGS_GET]", error)
    return new NextResponse(JSON.stringify({ error: "Internal server error" }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
}

export async function PATCH(req: Request) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser?.id) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      })
    }

    const body = await req.json()
    
    // 必要なフィールドだけを抽出してアップデートする
    const updateData = {
      targetTimeMon: body.targetTimeMon,
      targetTimeTue: body.targetTimeTue,
      targetTimeWed: body.targetTimeWed,
      targetTimeThu: body.targetTimeThu,
      targetTimeFri: body.targetTimeFri,
      targetTimeSat: body.targetTimeSat,
      targetTimeSun: body.targetTimeSun,
      checkInMon: body.checkInMon,
      checkInTue: body.checkInTue,
      checkInWed: body.checkInWed,
      checkInThu: body.checkInThu,
      checkInFri: body.checkInFri,
      checkInSat: body.checkInSat,
      checkInSun: body.checkInSun,
    }

    const user = await prisma.user.update({
      where: { id: currentUser.id },
      data: updateData,
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("[SETTINGS_PATCH]", error)
    return new NextResponse(JSON.stringify({ error: "Internal server error" }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
}
