"use client"

import { useRef, useState, useSyncExternalStore } from "react"

import {
  ACCENT_PRESETS,
  ACCENT_STORAGE_KEY,
  DEFAULT_ACCENT,
  applyAccent,
  hexToHsv,
  hsvToHex,
  isHexColor,
  type Hsv,
} from "@/lib/accent-colors"
import { cn } from "@/lib/utils"

const WHEEL_SIZE = 220

// The inline --primary on <html> (set by accentInitScript / applyAccent) is the source of truth.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] })
  return () => observer.disconnect()
}

function getSnapshot(): string {
  const value = document.documentElement.style.getPropertyValue("--primary").trim()
  return isHexColor(value) ? value.toLowerCase() : DEFAULT_ACCENT
}

function getServerSnapshot(): string {
  return DEFAULT_ACCENT
}

function save(hex: string) {
  try {
    localStorage.setItem(ACCENT_STORAGE_KEY, hex)
  } catch {
    // Private mode etc. — the color still applies for this session.
  }
}

export function AccentColorPicker() {
  const accent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  // Hue is undefined for grays, so keep the last hue/saturation the user touched.
  const [hsvOverride, setHsvOverride] = useState<{ hex: string; hsv: Hsv } | null>(null)
  const hsv = hsvOverride?.hex === accent ? hsvOverride.hsv : hexToHsv(accent)
  const wheelRef = useRef<HTMLDivElement>(null)

  const update = (next: Hsv, persist: boolean) => {
    const hex = hsvToHex(next)
    setHsvOverride({ hex, hsv: next })
    applyAccent(hex)
    if (persist) save(hex)
  }

  const pickFromPointer = (event: React.PointerEvent, persist: boolean) => {
    const rect = wheelRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = event.clientX - (rect.left + rect.width / 2)
    const y = event.clientY - (rect.top + rect.height / 2)
    const radius = rect.width / 2
    // 0° at the top, clockwise — matches the conic-gradient below.
    const h = (Math.atan2(x, -y) * 180) / Math.PI
    update({ h: (h + 360) % 360, s: Math.min(Math.hypot(x, y) / radius, 1), v: hsv.v }, persist)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const steps: Record<string, Partial<Hsv>> = {
      ArrowLeft: { h: (hsv.h + 355) % 360 },
      ArrowRight: { h: (hsv.h + 5) % 360 },
      ArrowUp: { s: Math.min(hsv.s + 0.05, 1) },
      ArrowDown: { s: Math.max(hsv.s - 0.05, 0) },
    }
    const step = steps[event.key]
    if (!step) return
    event.preventDefault()
    update({ ...hsv, ...step }, true)
  }

  const angle = (hsv.h * Math.PI) / 180
  const handleX = (WHEEL_SIZE / 2) * (1 + hsv.s * Math.sin(angle))
  const handleY = (WHEEL_SIZE / 2) * (1 - hsv.s * Math.cos(angle))

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[17px] font-semibold tracking-tight">アクセントカラー</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          ホイールをドラッグして、ボタンやリンク、選択中の項目の色を選べます。この端末に保存されます。
        </p>
      </div>

      <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center">
        <div
          ref={wheelRef}
          role="slider"
          tabIndex={0}
          aria-label="色相と彩度"
          aria-valuetext={accent}
          aria-valuenow={Math.round(hsv.h)}
          aria-valuemin={0}
          aria-valuemax={360}
          onKeyDown={handleKeyDown}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            pickFromPointer(event, false)
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) pickFromPointer(event, false)
          }}
          onPointerUp={(event) => pickFromPointer(event, true)}
          className="relative shrink-0 cursor-crosshair touch-none rounded-full shadow-themed outline-none focus-visible:ring-4 focus-visible:ring-primary/25"
          style={{
            width: WHEEL_SIZE,
            height: WHEEL_SIZE,
            background:
              "radial-gradient(circle closest-side, #fff, transparent), conic-gradient(red, yellow, lime, cyan, blue, magenta, red)",
          }}
        >
          {/* Darken the wheel with the brightness slider so it previews the real color */}
          <div
            className="pointer-events-none absolute inset-0 rounded-full bg-black"
            style={{ opacity: 1 - hsv.v }}
          />
          <svg className="pointer-events-none absolute inset-0" width={WHEEL_SIZE} height={WHEEL_SIZE}>
            <line
              x1={WHEEL_SIZE / 2}
              y1={WHEEL_SIZE / 2}
              x2={handleX}
              y2={handleY}
              stroke="white"
              strokeWidth={1.5}
              strokeOpacity={0.9}
            />
            <circle cx={WHEEL_SIZE / 2} cy={WHEEL_SIZE / 2} r={2.5} fill="white" />
          </svg>
          <div
            className="pointer-events-none absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_1px_4px_rgba(0,0,0,0.35)]"
            style={{ left: handleX, top: handleY, backgroundColor: accent }}
          />
        </div>

        <div className="w-full max-w-64 space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 rounded-full shadow-themed" style={{ backgroundColor: accent }} />
            <div>
              <p className="font-mono text-sm font-medium uppercase">{accent}</p>
              <button
                type="button"
                onClick={() => {
                  applyAccent(DEFAULT_ACCENT)
                  save(DEFAULT_ACCENT)
                }}
                className="text-xs text-primary hover:underline"
              >
                デフォルトに戻す
              </button>
            </div>
          </div>

          <label className="block space-y-2">
            <span className="text-xs font-medium text-muted-foreground">明るさ</span>
            <input
              type="range"
              min={20}
              max={100}
              value={Math.round(hsv.v * 100)}
              onChange={(event) => update({ ...hsv, v: Number(event.target.value) / 100 }, true)}
              className="h-2 w-full cursor-pointer appearance-none rounded-full range-thumb"
              style={{ background: `linear-gradient(to right, #000, ${hsvToHex({ ...hsv, v: 1 })})` }}
            />
          </label>

          <div className="flex flex-wrap gap-2.5">
            {ACCENT_PRESETS.map((preset) => {
              const isSelected = preset.hex === accent
              return (
                <button
                  key={preset.hex}
                  type="button"
                  aria-label={preset.label}
                  title={preset.label}
                  onClick={() => {
                    applyAccent(preset.hex)
                    save(preset.hex)
                  }}
                  className={cn(
                    "h-6 w-6 cursor-pointer rounded-full ring-offset-2 ring-offset-card transition-transform hover:scale-110 active:scale-95",
                    isSelected && "ring-2 ring-[color:var(--swatch)]",
                  )}
                  style={{ backgroundColor: preset.hex, ["--swatch" as string]: preset.hex }}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
