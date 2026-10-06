# Design System Inspired by Apple

## 1. Visual Theme & Atmosphere

Quiet, precise, content-first. The UI recedes so numbers, names and actions read clearly. A light-gray canvas (`#f5f5f7`) holds pure-white cards that are separated by soft, wide shadows rather than borders. There is exactly **one accent color — system blue (`#0071e3`)** — and it means "you can tap this". Everything else is grayscale, with system colors used only as small semantic tints (green = success, orange = rank/highlight, indigo = remote, red = error).

**Key Characteristics:**
- Light-gray canvas + white cards; no colored bands, no gradients
- One interactive accent (blue); semantic colors only as 10% tints with matching text
- Large, tight, semibold headlines; small labels are sentence-case, medium weight, secondary gray — never uppercase + wide tracking
- Generous radii (cards ≈ 22px, tiles ≈ 17px, dialogs ≈ 26px), full-pill buttons
- Translucent "vibrancy" material (`.glass`) for floating chrome: sidebar, mobile header, tab bar
- Motion is short and calm: fade / slide-up / scale-in, press = `scale(0.97)` + slight fade

## 2. Color Tokens (`src/app/globals.css`)

| Token | Value | Role |
|---|---|---|
| `--background` | `#f5f5f7` | Page canvas, inner panels (`bg-muted`) |
| `--card` | `#ffffff` | Cards, dialogs, popovers |
| `--foreground` | `#1d1d1f` | Primary label |
| `--muted-foreground` | `#6e6e73` | Secondary label |
| `--primary` | `#0071e3` | Buttons, links, active nav icon, focus ring |
| `--secondary` | `#e8e8ed` | Quiet fill buttons / chips |
| `--accent` | `#248a3d` | Success text (green, text-safe contrast) |
| `--destructive` | `#e30000` | Errors, late, negative points |
| `--border` | `rgba(0,0,0,0.08)` | Hairline separators |
| `--input` | `#d2d2d7` | Input / outline-button border |
| `--chart-1…5` | blue, green, indigo, orange, purple | Charts and stat icons |

**User-selectable accent.** `--primary` defaults to blue (`#0071e3`). In Settings, a color wheel (hue × saturation), brightness slider and preset swatches let each user pick any color; it is saved per device in `localStorage` and applied as inline `--primary` / `--primary-foreground` on `<html>` before first paint (`src/lib/accent-colors.ts`). The foreground flips between white and `#1d1d1f` for contrast. `--ring`, `--sidebar-primary`, `--chart-1` and the FAB glow derive from `--primary`, so never hard-code the blue — use `bg-primary`, `text-primary`, `text-primary-foreground`, `bg-primary/90` for hover.

Legacy names (`brand-house`, `brand-uplift`, `gold`, `gradient-primary`, …) are kept as aliases mapped onto this palette so older markup still renders consistently. Prefer the semantic tokens in new code.

## 3. Typography

- Stack: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Hiragino Sans", Inter, …` with `font-feature-settings: "palt"` for proportional kana.
- Page title: 34–48px, semibold, `tracking-tight`.
- Section title: 17–19px semibold.
- Stat value: 28px semibold, `tabular-nums`.
- Label / eyebrow: 12px medium, `text-muted-foreground`. No uppercase, no letter-spacing.
- Avoid `font-bold` / `font-black`; semibold is the heaviest weight.

## 4. Layout

- Desktop: translucent sidebar (260px) with macOS-style selection (`bg-black/[0.06]`, blue icon); content max-width 1200px, 40px top padding.
- Mobile: sticky glass header + iOS-style glass tab bar honoring `safe-area-inset-bottom`.
- Pages open with a large title on the canvas (no hero band), then white cards on a 24px rhythm.
- Lists inside cards use borderless rows on `bg-muted`, highlighted rows use `bg-primary/[0.06]`.

## 5. Elevation & Materials

- `--shadow-card`: `0 1px 2px rgba(0,0,0,.04), 0 4px 20px rgba(0,0,0,.04)` — default card.
- `--shadow-nav`: `0 2px 6px rgba(0,0,0,.04), 0 12px 40px rgba(0,0,0,.1)` — dialogs, hover lift.
- `.glass` / `.glass-nav`: `rgba(255,255,255,.72)` + `saturate(180%) blur(20px)`.
- Dialog overlay: `bg-black/25` + `backdrop-blur-sm`.

## 6. Components

- **Button**: pill, 36px default / 44px large, blue fill; outline = white + `--input` border; secondary = `#e8e8ed` fill.
- **Input**: 40px, `rounded-xl`, white, focus = blue border + 4px 15% blue ring.
- **Badge**: pill, 10% tint background + full-color text, no border.
- **Chat bubbles**: user = blue, assistant = `#e9e9eb`, 20px radius.
