import { isTauriRuntime } from "@/lib/tauriRuntime"
import { awaitWrap } from "@/lib/utils"
import { loadSetting, saveSetting } from "@/lib/settingsStore"

export async function getSetting<T>(key: string): Promise<T | null> {
  if (isTauriRuntime()) {
    return loadSetting<T>(key)
  }

  if (typeof window === "undefined") return null

  const [readErr, raw] = await awaitWrap<string | null>(
    Promise.resolve(localStorage.getItem(key))
  )
  if (readErr) return null
  if (raw == null) return null

  // JSON-first to support non-string values
  const [parseErr, parsed] = await awaitWrap<T>(Promise.resolve(JSON.parse(raw) as T))
  if (!parseErr) return parsed

  // fallback: treat as plain string
  return raw as unknown as T
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  if (isTauriRuntime()) {
    await saveSetting(key, value)
    return
  }

  if (typeof window === "undefined") return

  const serialized = typeof value === "string" ? value : JSON.stringify(value)
  const [err] = await awaitWrap<void>(Promise.resolve(localStorage.setItem(key, serialized)))
  if (err) {
    // ignore
  }
}
