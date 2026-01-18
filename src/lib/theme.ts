import { loadSetting, saveSetting } from "@/lib/settingsStore"

export type ThemeMode = "light" | "dark" | "system"

export interface ThemeSettings {
  mode: ThemeMode
  /** CSS variable value for --primary, formatted as: "<h> <s>% <l>%" or null for default */
  accentHsl: string | null
}

const STORAGE_KEY = "repo-zero:theme"

const defaultSettings: ThemeSettings = {
  mode: "system",
  accentHsl: null,
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function parseAccentHsl(value: string): { h: number; s: number; l: number } | null {
  // Expected format: "<h> <s>% <l>%"
  const parts = value.trim().split(/\s+/)
  if (parts.length !== 3) return null

  const h = Number(parts[0])
  const s = Number(parts[1].replace("%", ""))
  const l = Number(parts[2].replace("%", ""))

  if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) return null

  return { h, s, l }
}

function hslToRelativeLuminance(h: number, s: number, l: number) {
  // Convert HSL -> linear RGB -> relative luminance.
  // h: degrees, s/l: 0..100
  const hh = ((h % 360) + 360) % 360
  const ss = clamp01(s / 100)
  const ll = clamp01(l / 100)

  const c = (1 - Math.abs(2 * ll - 1)) * ss
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1))
  const m = ll - c / 2

  let r1 = 0
  let g1 = 0
  let b1 = 0

  if (hh < 60) {
    r1 = c
    g1 = x
  } else if (hh < 120) {
    r1 = x
    g1 = c
  } else if (hh < 180) {
    g1 = c
    b1 = x
  } else if (hh < 240) {
    g1 = x
    b1 = c
  } else if (hh < 300) {
    r1 = x
    b1 = c
  } else {
    r1 = c
    b1 = x
  }

  const r = r1 + m
  const g = g1 + m
  const b = b1 + m

  const toLinear = (u: number) =>
    u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4)

  const rl = toLinear(r)
  const gl = toLinear(g)
  const bl = toLinear(b)

  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl
}

function getPrimaryForegroundForAccent(accentHsl: string) {
  const parsed = parseAccentHsl(accentHsl)
  if (!parsed) return "210 40% 98%"

  const lum = hslToRelativeLuminance(parsed.h, parsed.s, parsed.l)
  // If primary is bright, use dark foreground; otherwise use light foreground.
  // Chosen to keep contrast reasonable across common accents.
  return lum > 0.45 ? "222.2 47.4% 11.2%" : "210 40% 98%"
}

function readLocal(): ThemeSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultSettings
    const parsed = JSON.parse(raw) as Partial<ThemeSettings>
    return {
      mode: parsed.mode ?? defaultSettings.mode,
      accentHsl: parsed.accentHsl ?? defaultSettings.accentHsl,
    }
  } catch {
    return defaultSettings
  }
}

function writeLocal(value: ThemeSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // ignore
  }
}

function applyThemeToDom(settings: ThemeSettings) {
  const root = document.documentElement

  // Keep primary button text readable when overriding --primary.
  if (settings.accentHsl) {
    root.style.setProperty("--primary", settings.accentHsl)
    root.style.setProperty(
      "--primary-foreground",
      getPrimaryForegroundForAccent(settings.accentHsl)
    )
  } else {
    root.style.removeProperty("--primary")
    root.style.removeProperty("--primary-foreground")
  }

  const shouldUseDark =
    settings.mode === "dark" ||
    (settings.mode === "system" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches)

  root.classList.toggle("dark", shouldUseDark)
}

let current = defaultSettings
let initialized = false
let mediaListenerCleanup: (() => void) | null = null

async function readPersisted(): Promise<ThemeSettings> {
  const local = readLocal()

  const stored = await loadSetting<Partial<ThemeSettings>>(STORAGE_KEY)
  if (!stored) return local

  return {
    mode: stored.mode ?? local.mode,
    accentHsl: stored.accentHsl ?? local.accentHsl,
  }
}

async function writePersisted(settings: ThemeSettings) {
  writeLocal(settings)
  await saveSetting(STORAGE_KEY, settings)
}

export function initTheme() {
  if (initialized) return
  initialized = true

  void (async () => {
    current = await readPersisted()
    applyThemeToDom(current)

    if (current.mode === "system" && window.matchMedia) {
      const mql = window.matchMedia("(prefers-color-scheme: dark)")
      const handler = () => applyThemeToDom(current)

      mediaListenerCleanup?.()

      if (typeof mql.addEventListener === "function") {
        mql.addEventListener("change", handler)
        mediaListenerCleanup = () => mql.removeEventListener("change", handler)
      } else {
        const legacy = mql as unknown as {
          addListener: (cb: () => void) => void
          removeListener: (cb: () => void) => void
        }
        legacy.addListener(handler)
        mediaListenerCleanup = () => legacy.removeListener(handler)
      }
    }
  })()


}

export function getThemeSettings(): ThemeSettings {
  return current
}

export function setThemeMode(mode: ThemeMode) {
  current = { ...current, mode }
  void writePersisted(current)
  // reset listener
  mediaListenerCleanup?.()
  mediaListenerCleanup = null
  applyThemeToDom(current)
  // When switching to system mode, attach OS listener.
  // When switching away from system mode, listener is already cleared above.
  if (mode === "system" && window.matchMedia) {
    const mql = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => applyThemeToDom(current)

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", handler)
      mediaListenerCleanup = () => mql.removeEventListener("change", handler)
    } else {
      const legacy = mql as unknown as {
        addListener: (cb: () => void) => void
        removeListener: (cb: () => void) => void
      }
      legacy.addListener(handler)
      mediaListenerCleanup = () => legacy.removeListener(handler)
    }
  }
}

export function setThemeAccentHsl(accentHsl: string | null) {
  current = { ...current, accentHsl }
  void writePersisted(current)
  applyThemeToDom(current)
}
