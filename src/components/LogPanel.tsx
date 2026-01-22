import {
  ArrowDownCircle,
  ChevronDown,
  Copy,
  Filter,
  Trash2,
  Search,
  Activity
} from "lucide-react"
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { useTranslation } from "react-i18next"
import {
  Button,
  cn,
} from "@/components/ui"
import { clearLogs, getLogSnapshot, type LogLevel, subscribeLogs } from "@/lib/logStore"

interface LogPanelProps {
  isOpen?: boolean
  onToggle?: (isOpen: boolean) => void
  className?: string
}

export function LogPanel({ isOpen: externalIsOpen, onToggle, className }: LogPanelProps) {
  const { t, i18n } = useTranslation()
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const isControlled = externalIsOpen !== undefined
  const open = isControlled ? externalIsOpen : internalIsOpen

  const snapshot = useSyncExternalStore(subscribeLogs, getLogSnapshot, getLogSnapshot)
  const logs = snapshot.entries

  const [autoScroll, setAutoScroll] = useState(true)
  const [filterText, setFilterText] = useState("")
  const [levelFilter, setLevelFilter] = useState<LogLevel | "all">("all")

  // Resizable logic
  const MIN_PANEL_HEIGHT = 180
  const MAX_PANEL_HEIGHT_PADDING = 120
  const DEFAULT_PANEL_HEIGHT_RATIO = 0.3
  const MAX_PANEL_HEIGHT_RATIO = 0.8

  const getMaxPanelHeight = () => {
    const byRatio = Math.round(window.innerHeight * MAX_PANEL_HEIGHT_RATIO)
    const byPadding = Math.max(MIN_PANEL_HEIGHT, window.innerHeight - MAX_PANEL_HEIGHT_PADDING)
    return Math.min(byRatio, byPadding)
  }

  const clampPanelHeight = (height: number) => {
    const max = getMaxPanelHeight()
    return Math.max(MIN_PANEL_HEIGHT, Math.min(height, max))
  }

  const [panelHeight, setPanelHeight] = useState(() => {
    if (typeof window === "undefined") return 320
    return clampPanelHeight(Math.round(window.innerHeight * DEFAULT_PANEL_HEIGHT_RATIO))
  })
  const [isDragging, setIsDragging] = useState(false)
  const draggingRef = useRef(false)

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!open) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    setIsDragging(true)
    draggingRef.current = true
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    const newHeight = window.innerHeight - e.clientY
    setPanelHeight(clampPanelHeight(newHeight))
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false)
    draggingRef.current = false
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  useEffect(() => {
    if (!open) return
    setPanelHeight((prev) => clampPanelHeight(prev))
  }, [open])

  useEffect(() => {
    if (!open) return
    const onResize = () => setPanelHeight((prev) => clampPanelHeight(prev))
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [open])

  const renderMessage = (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed.startsWith("I18N:")) return raw

    const rest = trimmed.slice("I18N:".length)
    const [key, argsRaw] = rest.split("|", 2)
    if (!key) return raw

    if (!argsRaw) return t(key)
    try {
      const parsed = JSON.parse(argsRaw) as Record<string, unknown>
      return t(key, parsed)
    } catch {
      return t(key)
    }
  }

  const scrollRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const toggleOpen = () => {
    if (onToggle) {
      onToggle(!open)
    } else {
      setInternalIsOpen(!internalIsOpen)
    }
  }

  useEffect(() => {
    if (autoScroll && open && endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs, autoScroll, open])

  const filteredLogs = useMemo(() => {
    const needle = filterText.trim()

    const normalize = (s: string) => s.toLocaleLowerCase("en-US")

    // Fuzzy match that supports:
    // - case-insensitive matching (for English)
    // - substring match
    // - subsequence match ("fuzzy" typing: e.g. "clr" matches "clear")
    // - multi-token AND match when input contains spaces
    const isSubsequence = (pattern: string, text: string) => {
      if (!pattern) return true
      let i = 0
      for (let j = 0; j < text.length && i < pattern.length; j++) {
        if (text[j] === pattern[i]) i++
      }
      return i === pattern.length
    }

    const fuzzyMatch = (pattern: string, text: string) => {
      const p = normalize(pattern)
      const t = normalize(text)
      if (!p) return true
      return t.includes(p) || isSubsequence(p, t)
    }

    const tokens = needle.split(/\s+/).filter(Boolean)

    // Pre-render messages once per language + logs snapshot.
    const renderedByRaw = new Map<string, string>()
    for (const e of logs) {
      if (!renderedByRaw.has(e.message)) {
        renderedByRaw.set(e.message, renderMessage(e.message))
      }
    }

    return logs.filter((e) => {
      if (levelFilter !== "all" && e.level !== levelFilter) return false

      if (tokens.length === 0) return true

      // Only match against the user-visible (rendered) message.
      const rendered = renderedByRaw.get(e.message) ?? ""
      return tokens.every((tok) => fuzzyMatch(tok, rendered))
    })
  }, [logs, filterText, levelFilter, i18n.language, i18n.resolvedLanguage])

  const getLogColor = (level: LogLevel) => {
    if (level === "error") return "text-red-500 dark:text-red-400"
    if (level === "warn") return "text-yellow-500 dark:text-yellow-400"
    if (level === "debug") return "text-muted-foreground"
    return "text-blue-500 dark:text-blue-300"
  }

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    const hh = String(d.getHours()).padStart(2, "0")
    const mm = String(d.getMinutes()).padStart(2, "0")
    const ss = String(d.getSeconds()).padStart(2, "0")
    return `${hh}:${mm}:${ss}`
  }

  const levelTabs: Array<{ id: LogLevel | "all"; label: string }> = [
    { id: "all", label: t("log_panel.level.all") },
    { id: "error", label: t("log_panel.level.error") },
    { id: "warn", label: t("log_panel.level.warn") },
    { id: "info", label: t("log_panel.level.info") },
    { id: "debug", label: t("log_panel.level.debug") },
  ]

  const formatEntryForCopy = (entry: (typeof logs)[number]) => {
    const msg = renderMessage(entry.message)
    const base = `[${formatTime(entry.ts)}] [${entry.level.toUpperCase()}] [${entry.category}] ${msg}`
    if (!entry.data) return base
    const dataStr =
      typeof entry.data === "string" ? entry.data : JSON.stringify(entry.data, null, 2)
    return `${base}\nData: ${dataStr}`
  }

  return (
    <>
      {/* Minimized Toggle Button (Visible when closed) */}
      <div
        className={cn(
          "fixed bottom-4 right-4 z-50 transition-all duration-500 ease-&lsqb;cubic-bezier(0.32,0.72,0,1)&rsqb; transform",
          open ? "translate-y-20 opacity-0 pointer-events-none scale-90" : "translate-y-0 opacity-100 scale-100"
        )}
      >
        <Button
          onClick={toggleOpen}
          className="rounded-full h-12 w-12 shadow-xl shadow-black/20 bg-background/80 backdrop-blur-md border border-border/50 hover:bg-primary hover:text-primary-foreground transition-all duration-300 group"
          size="icon"
        >
          <div className="relative">
            <Activity className="h-5 w-5 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
            {logs.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-primary border-2 border-background"></span>
              </span>
            )}
          </div>
        </Button>
      </div>

      {/* Main Panel */}
      <div
        style={{ height: open ? panelHeight : 0 }}
        className={cn(
          "fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border/50 shadow-2xl flex flex-col font-mono text-sm",
          isDragging ? "transition-none" : "transition-[height] duration-500 ease-&lsqb;cubic-bezier(0.32,0.72,0,1)&rsqb;",
          className
        )}
      >
        {/* Resize Handle */}
        <div
          className="absolute top-0 left-0 right-0 h-1.5 -mt-0.5 cursor-ns-resize z-50 hover:bg-primary/50 transition-colors touch-none group"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          title={t("log_panel.resize_tooltip")}
        >
            <div className="mx-auto w-16 h-1 rounded-full bg-muted-foreground/20 mt-0.5 group-hover:bg-primary/50 transition-colors" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border/50 shrink-0 select-none">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-background/50 border border-border/50">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground tracking-wide">
                {t("log_panel.title")}
              </span>
            </div>
            <span className="text-[10px] font-medium text-muted-foreground px-1.5 py-0.5 rounded-full bg-muted/50 border border-border/50 min-w-[20px] text-center">
              {logs.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative group flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder={t("log_panel.filter_placeholder")}
                className="h-8 bg-background/50 border border-border/50 text-foreground text-xs rounded-md pl-8 pr-3 w-32 focus:w-48 focus:bg-background transition-all outline-none focus:ring-1 focus:ring-primary/20 placeholder:text-muted-foreground/70"
              />
            </div>

            <div className="hidden sm:flex items-center gap-1 bg-muted/20 p-0.5 rounded-md border border-border/50">
              {levelTabs.map((tab) => (
                <button
                  key={tab.id}
                  className={cn(
                    "text-[10px] uppercase font-semibold px-2.5 py-1 rounded-sm transition-all",
                    levelFilter === tab.id
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                  onClick={() => setLevelFilter(tab.id)}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="w-px h-4 bg-border/50 mx-1" />

            <div className="flex items-center gap-1">
                <Button
                variant="ghost"
                size="icon"
                className={cn(
                    "h-8 w-8 rounded-md hover:bg-background/80",
                    autoScroll ? "text-primary bg-primary/10" : "text-muted-foreground"
                )}
                onClick={() => setAutoScroll(!autoScroll)}
                title={t("log_panel.auto_scroll_tooltip")}
                >
                <ArrowDownCircle className="h-4 w-4" />
                </Button>

                <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                onClick={clearLogs}
                title={t("log_panel.clear_tooltip")}
                >
                <Trash2 className="h-4 w-4" />
                </Button>

                <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-md hover:bg-background/80 text-muted-foreground"
                onClick={toggleOpen}
                title={t("log_panel.minimize_tooltip")}
                >
                <ChevronDown className="h-4 w-4" />
                </Button>
            </div>
          </div>
        </div>

        {/* Log Content */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-0.5 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/40 transition-colors"
        >
          {filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-3 opacity-50">
              <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center border border-border/50">
                <Filter className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium">{t("log_panel.no_logs")}</p>
            </div>
          ) : (
            filteredLogs.map((log, i) => (
              <div
                key={`${log.ts}-${i}`}
                className="group flex flex-col gap-1 text-[11px] leading-relaxed hover:bg-muted/30 p-1.5 rounded transition-colors border-l-2 border-transparent hover:border-border/50"
              >
                <div className="flex gap-3 items-baseline">
                  <span className="text-muted-foreground/50 select-none w-14 text-right shrink-0 font-mono text-[10px]">
                    {formatTime(log.ts)}
                  </span>
                    <span className={cn("break-all flex-1 font-mono", getLogColor(log.level))}>
                      <span className="opacity-50 mr-2 text-foreground/70 uppercase tracking-tighter text-[10px] border border-border/50 px-1 rounded-sm">
                        {log.category}
                      </span>
                      {renderMessage(log.message)}
                    </span>
                  <button
                    onClick={() => void navigator.clipboard.writeText(formatEntryForCopy(log))}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary p-1 hover:bg-background rounded"
                    title={t("log_panel.copy_tooltip")}
                    type="button"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
                {log.data !== undefined && (
                  <div className="pl-[4.5rem] pr-8 overflow-hidden">
                    <pre className="text-[10px] text-muted-foreground bg-muted/20 p-2 rounded border border-border/20 overflow-x-auto">
                      {typeof log.data === "string" ? log.data : JSON.stringify(log.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>
      </div>
    </>
  )
}
