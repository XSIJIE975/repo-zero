export type LogLevel = "error" | "warn" | "info" | "debug"

export interface LogEntry {
  ts: number
  level: LogLevel
  category: string
  message: string
  data?: unknown
}

export interface LogSnapshot {
  entries: ReadonlyArray<LogEntry>
}

const MAX_ENTRIES = 2000

let entries: LogEntry[] = []
let snapshot: LogSnapshot = { entries }
let listeners = new Set<() => void>()

function emitChange() {
  for (const l of listeners) l()
}

export function subscribeLogs(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getLogSnapshot(): LogSnapshot {
  return snapshot
}

export function clearLogs() {
  entries = []
  snapshot = { entries }
  emitChange()
}

export function addLog(entry: Omit<LogEntry, "ts"> & { ts?: number }) {
  const full: LogEntry = {
    ts: entry.ts ?? Date.now(),
    level: entry.level,
    category: entry.category,
    message: entry.message,
    data: entry.data,
  }

  entries = [...entries, full]
  if (entries.length > MAX_ENTRIES) {
    entries = entries.slice(entries.length - MAX_ENTRIES)
  }

  snapshot = { entries }

  emitChange()
}

export function logInfo(category: string, message: string, data?: unknown) {
  addLog({ level: "info", category, message, data })
}

export function logWarn(category: string, message: string, data?: unknown) {
  addLog({ level: "warn", category, message, data })
}

export function logError(category: string, message: string, data?: unknown) {
  addLog({ level: "error", category, message, data })
}

export function logDebug(category: string, message: string, data?: unknown) {
  addLog({ level: "debug", category, message, data })
}

export function parseLogEvent(payload: string): {
  level: LogLevel
  message: string
} {
  const trimmed = payload.trim()

  if (trimmed.startsWith("ERROR:")) {
    return { level: "error", message: trimmed.slice("ERROR:".length).trim() }
  }

  if (trimmed.startsWith("WARN:") || trimmed.startsWith("WARNING:")) {
    const prefix = trimmed.startsWith("WARN:") ? "WARN:" : "WARNING:"
    return { level: "warn", message: trimmed.slice(prefix.length).trim() }
  }

  if (trimmed.startsWith("DEBUG:")) {
    return { level: "debug", message: trimmed.slice("DEBUG:".length).trim() }
  }

  if (trimmed.startsWith("INFO:")) {
    return { level: "info", message: trimmed.slice("INFO:".length).trim() }
  }

  return { level: "info", message: payload }
}
