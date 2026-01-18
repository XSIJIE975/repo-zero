import {
  ArrowDownCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Filter,
  TerminalSquare,
  Trash2,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { useTranslation } from "react-i18next"
import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui"
import {
  clearLogs,
  configureConsoleMirror,
  getLogSnapshot,
  type LogLevel,
  subscribeLogs,
} from "@/lib/logStore"

interface LogPanelProps {
  isOpen?: boolean
  onToggle?: (isOpen: boolean) => void
  className?: string
}

export function LogPanel({ isOpen: externalIsOpen, onToggle, className }: LogPanelProps) {
  const { t } = useTranslation()
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const isControlled = externalIsOpen !== undefined
  const open = isControlled ? externalIsOpen : internalIsOpen

  const snapshot = useSyncExternalStore(subscribeLogs, getLogSnapshot, getLogSnapshot)
  const logs = snapshot.entries

  const [autoScroll, setAutoScroll] = useState(true)
  const [mirrorToConsole, setMirrorToConsole] = useState(import.meta.env.DEV)
  const [mirrorLevels, setMirrorLevels] = useState<LogLevel[]>(["error", "warn"])
  const [filterText, setFilterText] = useState("")
  const [levelFilter, setLevelFilter] = useState<LogLevel | "all">("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

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

  useEffect(() => {
    if (!import.meta.env.DEV) return
    configureConsoleMirror({
      enabled: mirrorToConsole,
      levels: new Set(mirrorLevels),
    })
  }, [mirrorToConsole, mirrorLevels])

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const e of logs) set.add(e.category)
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [logs])

  const filteredLogs = useMemo(() => {
    const needle = filterText.trim().toLowerCase()

    return logs.filter((e) => {
      if (levelFilter !== "all" && e.level !== levelFilter) return false
      if (categoryFilter !== "all" && e.category !== categoryFilter) return false

      if (!needle) return true
      const msg = e.message.toLowerCase()
      return msg.includes(needle) || e.category.toLowerCase().includes(needle)
    })
  }, [logs, filterText, levelFilter, categoryFilter])

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

  const mirrorLevelOptions: Array<{ id: LogLevel; label: string }> = [
    { id: "error", label: t("log_panel.level.error") },
    { id: "warn", label: t("log_panel.level.warn") },
    { id: "info", label: t("log_panel.level.info") },
    { id: "debug", label: t("log_panel.level.debug") },
  ]

  const toggleMirrorLevel = (lvl: LogLevel) => {
    setMirrorLevels((prev) =>
      prev.includes(lvl) ? prev.filter((x) => x !== lvl) : [...prev, lvl]
    )
  }

  const formatEntryForCopy = (entry: (typeof logs)[number]) => {
    const base = `[${formatTime(entry.ts)}] [${entry.level.toUpperCase()}] [${entry.category}] ${entry.message}`
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
          "fixed bottom-4 right-4 z-50 transition-all duration-300 transform",
          open ? "translate-y-20 opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
        )}
      >
        <Button
          onClick={toggleOpen}
          className="rounded-full h-12 w-12 shadow-lg bg-background border border-border hover:bg-accent"
          size="icon"
        >
          <div className="relative">
            <ChevronUp className="h-6 w-6 text-muted-foreground" />
            {logs.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
            )}
          </div>
        </Button>
      </div>

      {/* Main Panel */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border shadow-2xl transition-all duration-300 ease-in-out flex flex-col font-mono",
          open ? "h-[30vh]" : "h-0",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              {t("log_panel.title")}
            </span>
            <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted border border-border">
              {logs.length}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <div className="relative group mr-2">
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder={t("log_panel.filter_placeholder")}
                className="bg-background border border-input text-foreground text-xs rounded pl-2 pr-8 py-1 w-24 focus:w-48 transition-all outline-none focus:border-primary placeholder:text-muted-foreground"
              />
              <Filter className="absolute right-2 top-1.5 h-3 w-3 text-muted-foreground pointer-events-none" />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-background border border-input text-foreground text-xs rounded px-2 py-1 outline-none focus:border-primary"
              title={t("log_panel.category.label")}
            >
              <option value="all">{t("log_panel.category.all")}</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <div className="hidden sm:flex items-center gap-1 ml-2">
              {levelTabs.map((tab) => (
                <button
                  key={tab.id}
                  className={cn(
                    "text-[10px] uppercase tracking-wider px-2 py-1 rounded border transition-colors",
                    levelFilter === tab.id
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-background border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  onClick={() => setLevelFilter(tab.id)}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {import.meta.env.DEV && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-7 w-7 rounded hover:bg-accent",
                      mirrorToConsole ? "text-primary" : "text-muted-foreground"
                    )}
                    title={t("log_panel.console_mirror.tooltip")}
                  >
                    <TerminalSquare className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 mb-2">
                  <DropdownMenuLabel>{t("log_panel.console_mirror.title")}</DropdownMenuLabel>
                  <DropdownMenuCheckboxItem
                    checked={mirrorToConsole}
                    onCheckedChange={(checked) => setMirrorToConsole(Boolean(checked))}
                  >
                    {t("log_panel.console_mirror.enabled")}
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>{t("log_panel.console_mirror.levels")}</DropdownMenuLabel>
                  {mirrorLevelOptions.map((opt) => (
                    <DropdownMenuCheckboxItem
                      key={opt.id}
                      checked={mirrorLevels.includes(opt.id)}
                      onCheckedChange={() => toggleMirrorLevel(opt.id)}
                      disabled={!mirrorToConsole}
                    >
                      {opt.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-7 w-7 rounded hover:bg-accent",
                autoScroll ? "text-primary" : "text-muted-foreground"
              )}
              onClick={() => setAutoScroll(!autoScroll)}
              title={t("log_panel.auto_scroll_tooltip")}
            >
              <ArrowDownCircle className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded hover:bg-accent text-muted-foreground hover:text-destructive"
              onClick={clearLogs}
              title={t("log_panel.clear_tooltip")}
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            <div className="w-px h-4 bg-border mx-1" />

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded hover:bg-accent text-muted-foreground"
              onClick={toggleOpen}
              title={t("log_panel.minimize_tooltip")}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Log Content */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
        >
          {filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border border-border">
                <Filter className="h-5 w-5 opacity-50" />
              </div>
              <p className="text-xs">{t("log_panel.no_logs")}</p>
            </div>
          ) : (
            filteredLogs.map((log, i) => (
              <div
                key={`${log.ts}-${i}`}
                className="group flex flex-col gap-1 text-xs font-mono hover:bg-muted/50 p-1 rounded -mx-2 px-2 transition-colors border-l-2 border-transparent hover:border-border"
              >
                <div className="flex gap-3 items-start">
                  <span className="text-muted-foreground select-none w-16 text-right shrink-0 opacity-70">
                    {formatTime(log.ts)}
                  </span>
                  <span className={cn("break-all flex-1", getLogColor(log.level))}>
                    <span className="opacity-60 mr-1 text-foreground">[{log.category}]</span>
                    {log.message}
                  </span>
                  <button
                    onClick={() => void navigator.clipboard.writeText(formatEntryForCopy(log))}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                    title={t("log_panel.copy_tooltip")}
                    type="button"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
                {log.data !== undefined && (
                  <div className="pl-20 pr-4 overflow-hidden">
                    <pre className="text-[10px] text-muted-foreground bg-muted/30 p-1 rounded overflow-x-auto">
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
