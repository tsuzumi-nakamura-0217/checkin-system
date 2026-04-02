"use client"

import { useState, useEffect } from "react"

type UserSettings = {
  targetTimeMon: string
  targetTimeTue: string
  targetTimeWed: string
  targetTimeThu: string
  targetTimeFri: string
  targetTimeSat: string
  targetTimeSun: string
  checkInMon: boolean
  checkInTue: boolean
  checkInWed: boolean
  checkInThu: boolean
  checkInFri: boolean
  checkInSat: boolean
  checkInSun: boolean
}

export function SettingsForm() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setSettings(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!settings) {
    return <div>設定を読み込めませんでした。</div>
  }

  const parseTime = (time: string | null) => time || "09:00"

  const handleChange = (day: string, field: "targetTime" | "checkIn", value: string | boolean) => {
    setSettings((prev) => {
      if (!prev) return prev
      return { ...prev, [`${field}${day}`]: value }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })

      if (!res.ok) throw new Error("Failed to save settings")

      setMessage({ text: "設定を保存しました", type: "success" })
    } catch (err) {
      console.error(err)
      setMessage({ text: "設定の保存に失敗しました", type: "error" })
    } finally {
      setSaving(false)
    }
  }

  const days = [
    { id: "Mon", label: "月曜日", short: "月" },
    { id: "Tue", label: "火曜日", short: "火" },
    { id: "Wed", label: "水曜日", short: "水" },
    { id: "Thu", label: "木曜日", short: "木" },
    { id: "Fri", label: "金曜日", short: "金" },
    { id: "Sat", label: "土曜日", short: "土" },
    { id: "Sun", label: "日曜日", short: "日" },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {message && (
        <div
          className={`flex items-center gap-3 rounded-2xl p-4 text-sm font-bold shadow-sm ${
            message.type === "success"
              ? "bg-primary text-primary-foreground"
              : "bg-destructive text-white"
          }`}
        >
          {message.type === "success" ? (
            <svg className="h-5 w-5 fill-current" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="h-5 w-5 fill-current" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          )}
          {message.text}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <ul className="divide-y divide-border">
          {days.map(({ id, label, short }) => {
            const isChecked = Boolean(settings[`checkIn${id}` as keyof UserSettings] ?? false)
            const timeValue = settings[`targetTime${id}` as keyof UserSettings] as string

            return (
              <li
                key={id}
                className="group flex flex-col gap-4 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-medium transition-colors ${
                      isChecked
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {short}
                  </div>
                  <div className="flex flex-col">
                    <span
                      className={`text-[15px] font-medium transition-colors ${
                        isChecked ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end sm:gap-6">
                  <div
                    className={`flex items-center transition-all duration-300 ${
                      isChecked
                        ? "opacity-100"
                        : "pointer-events-none opacity-60"
                    }`}
                  >
                    <label className="mr-3 hidden text-[13px] text-muted-foreground sm:block">
                      目標時刻
                    </label>
                    <input
                      type="time"
                      value={parseTime(timeValue)}
                      onChange={(e) => handleChange(id, "targetTime", e.target.value)}
                      disabled={!isChecked}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground outline-none transition-colors focus:border-ring focus:bg-background focus:ring-1 focus:ring-ring disabled:bg-secondary"
                    />
                  </div>

                  <label className="relative ml-4 flex cursor-pointer items-center sm:ml-0">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={isChecked}
                      onChange={(e) => handleChange(id, "checkIn", e.target.checked)}
                    />
                    <div className="h-6 w-11 rounded-full bg-secondary transition-colors peer-checked:bg-primary peer-focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"></div>
                    <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-all peer-checked:translate-x-full shadow-sm"></div>
                  </label>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-[15px] font-medium text-primary-foreground transition-colors hover:bg-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:bg-muted"
        >
          <span>{saving ? "保存中..." : "変更を保存"}</span>
        </button>
      </div>
    </form>
  )
}
