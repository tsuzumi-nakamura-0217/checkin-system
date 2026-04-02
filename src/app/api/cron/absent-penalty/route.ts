import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    // Basic API Key check to prevent unauthorized execution
    const authHeader = request.headers.get('authorization');
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    // JST Offset (+9 hours)
    const jstOffset = 9 * 60 * 60 * 1000;
    const todayJST = new Date(now.getTime() + jstOffset);
    
    const year = todayJST.getUTCFullYear();
    const month = todayJST.getUTCMonth();
    const date = todayJST.getUTCDate();
    const dayOfWeek = todayJST.getUTCDay();

    const startOfTodayUTC = new Date(Date.UTC(year, month, date, -9, 0, 0, 0));
    const endOfTodayUTC = new Date(Date.UTC(year, month, date, 14, 59, 59, 999)); // 23:59:59.999 JST

    // Check which users should be checking in today
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
    const currentDayName = dayNames[dayOfWeek];

    const users = await prisma.user.findMany();

    let processedCount = 0;
    let penalizedCount = 0;

    for (const user of users) {
      processedCount++;
      // Skip if user does not need to check in today
      const shouldCheckIn = user[`checkIn${currentDayName}` as keyof typeof user];
      if (!shouldCheckIn) continue;

      // Skip if they already checked in today
      const existingCheckIn = await prisma.checkIn.findFirst({
        where: {
          userId: user.id,
          time: {
            gte: startOfTodayUTC,
            lte: endOfTodayUTC,
          },
        },
      });

      if (existingCheckIn) continue;

      // Skip if they have an approved ABSENT exception for today
      const existingException = await prisma.exceptionRequest.findFirst({
        where: {
          userId: user.id,
          type: 'ABSENT',
          status: 'APPROVED',
          date: {
            gte: startOfTodayUTC,
            lte: endOfTodayUTC,
          },
        },
      });

      if (existingException) continue;

      // Check if they have a LATE exception to override their target time
      const lateException = await prisma.exceptionRequest.findFirst({
        where: {
          userId: user.id,
          type: 'LATE',
          status: 'APPROVED',
          date: {
            gte: startOfTodayUTC,
            lte: endOfTodayUTC,
          },
        },
      });

      let targetTimeStr = user[`targetTime${currentDayName}` as keyof typeof user] as string;
      if (lateException && lateException.newTargetTime) {
        targetTimeStr = lateException.newTargetTime;
      }

      if (!targetTimeStr) {
        targetTimeStr = "09:00"; // fallback
      }

      // Calculate penalty points
      const [targetHourStr, targetMinStr] = targetTimeStr.split(':');
      const targetHour = parseInt(targetHourStr, 10);
      const targetMin = parseInt(targetMinStr, 10);

      // Target time in JST
      const targetDateJST = new Date(Date.UTC(year, month, date, targetHour - 9, targetMin, 0, 0));

      // Calculate time passed until end of day (24:00 JST)
      // Since they never showed up, we assume penalty until midnight.
      const endOfDayDateForCalc = new Date(Date.UTC(year, month, date, 15, 0, 0, 0)); // 24:00 JST / 15:00 UTC

      let diffInMs = endOfDayDateForCalc.getTime() - targetDateJST.getTime();
      
      // If cron is triggered before 24:00 (e.g. at currently executing time)
      const currentUTC = now.getTime();
      if (currentUTC < endOfDayDateForCalc.getTime()) {
         diffInMs = currentUTC - targetDateJST.getTime();
      }

      if (diffInMs > 0) {
        const lateHours = Math.floor(diffInMs / (1000 * 60 * 60));
        
        if (lateHours > 0) {
          const penaltyPoints = -(lateHours * 100);

          // Insert an absent record and deduct points
          await prisma.$transaction([
            prisma.checkIn.create({
              data: {
                userId: user.id,
                time: now,
                targetTime: targetTimeStr,
                status: 'ABSENT',
                pointsEarned: penaltyPoints,
              }
            }),
            prisma.user.update({
              where: { id: user.id },
              data: { points: { increment: penaltyPoints } }
            })
          ]);
          penalizedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cron executed. Processed ${processedCount} users, penalized ${penalizedCount} users.`,
    });

  } catch (error) {
    console.error("Error in absent-penalty cron:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
