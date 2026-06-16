// タグの色プリセット。Tailwind の purge 対策のため、クラス文字列はすべてリテラルで保持する。

export type TagColorPreset = {
  key: string
  label: string
  badge: string // バッジ表示用 (背景 + 文字 + 枠線)
  dot: string // 色選択UIのスウォッチ用
}

export const TAG_COLORS: TagColorPreset[] = [
  { key: "slate", label: "グレー", badge: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-500" },
  { key: "rose", label: "ローズ", badge: "bg-rose-100 text-rose-700 border-rose-200", dot: "bg-rose-500" },
  { key: "amber", label: "アンバー", badge: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  { key: "emerald", label: "グリーン", badge: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  { key: "sky", label: "スカイ", badge: "bg-sky-100 text-sky-700 border-sky-200", dot: "bg-sky-500" },
  { key: "violet", label: "バイオレット", badge: "bg-violet-100 text-violet-700 border-violet-200", dot: "bg-violet-500" },
  { key: "pink", label: "ピンク", badge: "bg-pink-100 text-pink-700 border-pink-200", dot: "bg-pink-500" },
  { key: "lime", label: "ライム", badge: "bg-lime-100 text-lime-700 border-lime-200", dot: "bg-lime-500" },
]

export const DEFAULT_TAG_COLOR = "slate"

const TAG_COLOR_MAP = new Map(TAG_COLORS.map((preset) => [preset.key, preset]))

export function isValidTagColor(color: unknown): color is string {
  return typeof color === "string" && TAG_COLOR_MAP.has(color)
}

export function getTagColorPreset(color: string): TagColorPreset {
  return TAG_COLOR_MAP.get(color) ?? TAG_COLOR_MAP.get(DEFAULT_TAG_COLOR)!
}
