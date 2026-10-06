// User-chosen accent color (Settings → color wheel). Stored per device as a
// hex string and applied as inline --primary / --primary-foreground on <html>.

export const DEFAULT_ACCENT = "#0071e3"

export const ACCENT_STORAGE_KEY = "accent-color"

export const ACCENT_PRESETS = [
  { label: "ブルー", hex: "#0071e3" },
  { label: "パープル", hex: "#8e44ad" },
  { label: "ピンク", hex: "#e0457b" },
  { label: "レッド", hex: "#e5383b" },
  { label: "オレンジ", hex: "#f56300" },
  { label: "イエロー", hex: "#b8860b" },
  { label: "グリーン", hex: "#1f9d55" },
  { label: "ティール", hex: "#0a9396" },
  { label: "グラファイト", hex: "#6e6e73" },
] as const

const HEX_RE = /^#[0-9a-f]{6}$/i

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_RE.test(value)
}

export type Hsv = { h: number; s: number; v: number } // h: 0–360, s/v: 0–1

export function hsvToHex({ h, s, v }: Hsv): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1))
  }
  return "#" + [f(5), f(3), f(1)].map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("")
}

export function hexToHsv(hex: string): Hsv {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b)
  const d = max - Math.min(r, g, b)
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
  }
  return { h: (h * 60 + 360) % 360, s: max === 0 ? 0 : d / max, v: max }
}

// White text unless the accent is too light for it (WCAG contrast < 3:1).
export function foregroundFor(hex: string): string {
  const lum = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0)
  return 1.05 / (lum + 0.05) >= 3 ? "#ffffff" : "#1d1d1f"
}

export function applyAccent(hex: string) {
  const style = document.documentElement.style
  if (hex.toLowerCase() === DEFAULT_ACCENT) {
    style.removeProperty("--primary")
    style.removeProperty("--primary-foreground")
  } else {
    style.setProperty("--primary", hex)
    style.setProperty("--primary-foreground", foregroundFor(hex))
  }
}

// Runs inline in <head> before first paint so the saved accent never flashes.
// Mirrors applyAccent + foregroundFor; keep the two in sync.
export const accentInitScript = `try{var a=localStorage.getItem("${ACCENT_STORAGE_KEY}");if(a&&${HEX_RE}.test(a)){var l=[1,3,5].map(function(i){var c=parseInt(a.slice(i,i+2),16)/255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)}),y=0.2126*l[0]+0.7152*l[1]+0.0722*l[2],s=document.documentElement.style;s.setProperty("--primary",a);s.setProperty("--primary-foreground",1.05/(y+0.05)>=3?"#ffffff":"#1d1d1f")}}catch(e){}`
