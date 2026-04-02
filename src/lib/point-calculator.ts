export function calculateCheckInPoints(targetTime: string, actualTime: Date): { points: number, status: 'EARLY' | 'LATE' | 'ON_TIME' } {
  // DBの targetTime ("09:00" など) を Date に変換して比較するロジック
  const [targetHour, targetMin] = targetTime.split(':').map(Number);
  
  const targetDate = new Date(actualTime);
  targetDate.setHours(targetHour, targetMin, 0, 0);
  
  const diffInMs = actualTime.getTime() - targetDate.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);
  
  if (diffInHours <= 0) {
    // 早く到着した場合
    const earlyHours = Math.floor(Math.abs(diffInHours));
    if (earlyHours > 0) {
      return { points: earlyHours * 100, status: 'EARLY' };
    }
    return { points: 0, status: 'ON_TIME' };
  } else {
    // 遅刻した場合
    const lateHours = Math.floor(diffInHours);
    if (lateHours > 0) {
      return { points: -(lateHours * 100), status: 'LATE' };
    }
    // 0〜59分の遅れは0ポイント変動でLATEまたはON_TIME扱い（要件に準拠: ぴったり1時間のルール）
    return { points: 0, status: 'ON_TIME' }; // 丸めてON_TIMEとする
  }
}
