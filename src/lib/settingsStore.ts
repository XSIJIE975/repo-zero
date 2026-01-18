import { Store } from "@tauri-apps/plugin-store"

import { isTauriRuntime } from "@/lib/tauriRuntime"
import { awaitWrap } from "@/lib/utils"

const STORE_FILE = "settings.json"

let storePromise: Promise<Store> | null = null

async function getStore(): Promise<Store> {
  if (!storePromise) {
    // plugin-store v2 uses a static factory
    storePromise = Store.load(STORE_FILE)
  }
  return storePromise
}

export async function loadSetting<T>(key: string): Promise<T | null> {
  if (!isTauriRuntime()) return null

  const [storeErr, store] = await awaitWrap(getStore())
  if (storeErr || !store) return null

  const [getErr, value] = await awaitWrap<T | undefined>(store.get<T>(key))
  if (getErr) return null

  return value ?? null
}

export async function saveSetting<T>(key: string, value: T): Promise<void> {
  if (!isTauriRuntime()) return

  const [storeErr, store] = await awaitWrap(getStore())
  if (storeErr || !store) return

  const [setErr] = await awaitWrap(store.set(key, value))
  if (setErr) return

  const [saveErr] = await awaitWrap(store.save())
  if (saveErr) {
    // ignore
  }
}
