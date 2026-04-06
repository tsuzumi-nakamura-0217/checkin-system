import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/current-user"

export async function GET() {
  try {
    const goal = await prisma.communityGoal.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(goal)
  } catch (error) {
    console.error("Error fetching community goal:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Optional: Check if user is ADMIN if roles are enforced
    // if (user.role !== "ADMIN") { ... }

    const body = await req.json()
    const { title, description, targetPoints, deadline, type } = body

    if (!title || !targetPoints || !deadline) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Default to POINTS if not provided
    const goalType = type || "POINTS"

    // Deactivate existing goals
    await prisma.communityGoal.updateMany({
      where: { isActive: true },
      data: { 
        isActive: false,
        completedAt: new Date(),
      },
    })

    const newGoal = await prisma.communityGoal.create({
      data: {
        title,
        description,
        targetPoints: parseInt(targetPoints),
        deadline: new Date(deadline),
        type: goalType,
        isActive: true,
      },
    })

    return NextResponse.json(newGoal)
  } catch (error) {
    console.error("Error creating community goal:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
