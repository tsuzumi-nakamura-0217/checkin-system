import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const pastGoals = await prisma.communityGoal.findMany({
      where: { isActive: false },
      orderBy: { completedAt: "desc" },
    })

    return NextResponse.json(pastGoals)
  } catch (error) {
    console.error("Error fetching community history:", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
