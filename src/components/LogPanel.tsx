import {
  ArrowDownCircle,
  Copy,
  Check,
  Filter,
  Trash2,
  Search,
  Activity,
  Minimize2,
  Settings2,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useDeferredValue,
  memo,
} from "react";
import { useTranslation } from "react-i18next";
import {
  FixedSizeList as List,
  ListChildComponentProps,
  areEqual,
} from "react-window";
import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui";
import {
  clearLogs,
  getLogSnapshot,
  type LogLevel,
  subscribeLogs,
  type LogEntry,
} from "@/lib/logStore";
import { getSetting, setSetting } from "@/lib/settings";

type Density = "compact" | "comfortable";

const LOG_PANEL_DENSITY_KEY = "repo-zero:log_panel:density";

function isDensity(v: unknown): v is Density {
  return v === "compact" || v === "comfortable";
}

const getLogColor = (level: LogLevel) => {
  if (level === "error") return "text-red-500 dark:text-red-400 font-bold";
  if (level === "warn") return "text-warning font-medium";
  if (level === "debug") return "text-muted-foreground italic";
  return "text-blue-500 dark:text-blue-300";
};

const formatTime = (ts: number) => {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
};

interface ItemData {
  logs: ReadonlyArray<LogEntry>;
  densityUi: any;
  renderMessage: (raw: string) => string;
  formatEntryForCopy: (entry: LogEntry) => string;
  t: any;
  handleCopyLog: (index: number, text: string) => void;
  copiedIndex: number | null;
}

const LogRow = memo(
  ({ index, style, data }: ListChildComponentProps<ItemData>) => {
    const {
      logs,
      densityUi,
      renderMessage,
      formatEntryForCopy,
      t,
      handleCopyLog,
      copiedIndex,
    } = data;
    const log = logs[index];
    const isCopied = copiedIndex === index;

    return (
      <div
        style={style}
        className={cn(
          "group flex flex-col hover:bg-muted/40 rounded-lg transition-all border border-transparent hover:border-border/30",
          densityUi.row,
        )}
      >
        <div className={cn("flex items-baseline relative", densityUi.rowGap)}>
          <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity z-10">
            <button
              onClick={() => handleCopyLog(index, formatEntryForCopy(log))}
              className={cn(
                "text-muted-foreground hover:text-primary hover:bg-background/80 rounded-md shadow-sm border border-border/50 bg-background/50 backdrop-blur-sm",
                densityUi.copyBtn,
              )}
              title={
                isCopied
                  ? t("log_panel.copied_tooltip")
                  : t("log_panel.copy_tooltip")
              }
              type="button"
            >
              {isCopied ? (
                <Check className={cn(densityUi.copyIcon, "text-green-500")} />
              ) : (
                <Copy className={densityUi.copyIcon} />
              )}
            </button>
          </div>

          <span
            className={cn(
              "text-muted-foreground/40 select-none text-right shrink-0 font-mono tabular-nums tracking-tighter",
              densityUi.ts,
            )}
          >
            {formatTime(log.ts)}
          </span>

          <div className="flex-1 min-w-0">
            <div className={cn("flex items-center", densityUi.metaRow)}>
              <span
                className={cn(
                  "uppercase tracking-wider font-bold rounded border",
                  densityUi.badge,
                  log.level === "error"
                    ? "bg-red-500/10 border-red-500/20 text-red-500"
                    : log.level === "warn"
                      ? "bg-warning/10 border-warning/20 text-warning"
                      : log.level === "info"
                        ? "bg-blue-500/10 border-blue-500/20 text-blue-500"
                        : "bg-muted/30 border-muted-foreground/20 text-muted-foreground",
                )}
              >
                {log.level}
              </span>
              <span
                className={cn(
                  "text-muted-foreground/60 font-semibold",
                  densityUi.category,
                )}
              >
                {log.category}
              </span>
            </div>
            <span
              className={cn(
                "break-words block font-mono",
                densityUi.message,
                getLogColor(log.level),
              )}
            >
              {renderMessage(log.message)}
            </span>
          </div>
        </div>
        {log.data !== undefined && (
          <div className={densityUi.dataWrap}>
            <div
              className={cn(
                "bg-background/50 rounded-lg border border-border/30 overflow-hidden shadow-inner",
                densityUi.dataBox,
              )}
            >
              <pre
                className={cn(
                  "text-muted-foreground overflow-x-auto font-mono",
                  densityUi.dataPre,
                )}
              >
                {typeof log.data === "string"
                  ? log.data
                  : JSON.stringify(log.data, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    );
  },
  areEqual,
);

interface LogPanelProps {
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  className?: string;
}

export function LogPanel({
  isOpen: externalIsOpen,
  onToggle,
  className,
}: LogPanelProps) {
  const { t, i18n } = useTranslation();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = externalIsOpen !== undefined;
  const open = isControlled ? externalIsOpen : internalIsOpen;

  const snapshot = useSyncExternalStore(
    subscribeLogs,
    getLogSnapshot,
    getLogSnapshot,
  );
  const logs = snapshot.entries;

  const [autoScroll, setAutoScroll] = useState(true);
  const [filterText, setFilterText] = useState("");
  const deferredFilterText = useDeferredValue(filterText);
  const [levelFilter, setLevelFilter] = useState<LogLevel | "all">("all");
  const [density, setDensity] = useState<Density>("compact");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Load density setting
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const saved = await getSetting<Density>(LOG_PANEL_DENSITY_KEY);
      if (cancelled) return;
      if (!isDensity(saved)) return;
      setDensity(saved);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateDensity = (next: Density) => {
    setDensity(next);
    void setSetting(LOG_PANEL_DENSITY_KEY, next);
  };

  const densityUi = useMemo(() => {
    if (density === "compact") {
      return {
        header: "gap-3 px-4 py-2",
        headerTitleIconWrap: "h-5 w-5 rounded-md",
        headerTitleIcon: "h-3.5 w-3.5",
        tabsWrap: "p-0.5",
        tabBtn: "text-[10px] px-2 py-0.5",
        searchWrap: "w-48 px-2.5 py-1",
        searchIcon: "h-3 w-3",
        searchInput: "text-[11px]",
        filterClearIcon: "h-3 w-3",
        actionsWrap: "gap-1",
        actionBtn: "h-7 w-7",
        actionIcon: "h-3.5 w-3.5",
        content: "p-3 space-y-0.5",
        row: "py-1 px-2.5",
        rowGap: "gap-2.5",
        copyBtn: "p-1.5",
        copyIcon: "h-3 w-3",
        ts: "w-[4.25rem] text-[10px]",
        metaRow: "gap-1.5 mb-0.5",
        badge: "text-[9px] px-1 py-0.5",
        category: "text-[9px]",
        message: "text-[11px] leading-snug",
        dataWrap: "mt-1.5",
        dataBox: "p-1.5",
        dataPre: "text-[9px] leading-snug",
      };
    }

    // comfortable
    return {
      header: "gap-4 px-5 py-3",
      headerTitleIconWrap: "h-6 w-6 rounded-md",
      headerTitleIcon: "h-4 w-4",
      tabsWrap: "p-1",
      tabBtn: "text-[11px] px-2.5 py-1",
      searchWrap: "w-56 px-3 py-1.5",
      searchIcon: "h-3.5 w-3.5",
      searchInput: "text-xs",
      filterClearIcon: "h-3.5 w-3.5",
      actionsWrap: "gap-1.5",
      actionBtn: "h-8 w-8",
      actionIcon: "h-4 w-4",
      content: "p-4 space-y-1",
      row: "py-1.5 px-3",
      rowGap: "gap-3",
      copyBtn: "p-2",
      copyIcon: "h-3.5 w-3.5",
      ts: "w-[4.5rem] text-[11px]",
      metaRow: "gap-2 mb-1",
      badge: "text-[10px] px-1.5 py-0.5",
      category: "text-[10px]",
      message: "text-xs leading-relaxed",
      dataWrap: "mt-2",
      dataBox: "p-2",
      dataPre: "text-[10px] leading-relaxed",
    };
  }, [density]);

  // Resizable logic
  const MIN_PANEL_HEIGHT = 180;
  const MAX_PANEL_HEIGHT_PADDING = 120;
  const DEFAULT_PANEL_HEIGHT_RATIO = 0.3;
  const MAX_PANEL_HEIGHT_RATIO = 0.8;

  const getMaxPanelHeight = () => {
    const byRatio = Math.round(window.innerHeight * MAX_PANEL_HEIGHT_RATIO);
    const byPadding = Math.max(
      MIN_PANEL_HEIGHT,
      window.innerHeight - MAX_PANEL_HEIGHT_PADDING,
    );
    return Math.min(byRatio, byPadding);
  };

  const clampPanelHeight = (height: number) => {
    const max = getMaxPanelHeight();
    return Math.max(MIN_PANEL_HEIGHT, Math.min(height, max));
  };

  const [panelHeight, setPanelHeight] = useState(() => {
    if (typeof window === "undefined") return 320;
    return clampPanelHeight(
      Math.round(window.innerHeight * DEFAULT_PANEL_HEIGHT_RATIO),
    );
  });
  const [isDragging, setIsDragging] = useState(false);
  const draggingRef = useRef(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!open) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    draggingRef.current = true;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const newHeight = window.innerHeight - e.clientY;
    setPanelHeight(clampPanelHeight(newHeight));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  useEffect(() => {
    if (!open) return;
    setPanelHeight((prev) => clampPanelHeight(prev));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => setPanelHeight((prev) => clampPanelHeight(prev));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open]);

  const renderMessage = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed.startsWith("I18N:")) return raw;

    const rest = trimmed.slice("I18N:".length);
    const [key, argsRaw] = rest.split("|", 2);
    if (!key) return raw;

    if (!argsRaw) return t(key);
    try {
      const parsed = JSON.parse(argsRaw) as Record<string, unknown>;
      return t(key, parsed);
    } catch {
      return t(key);
    }
  };

  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);

  const toggleOpen = () => {
    if (onToggle) {
      onToggle(!open);
    } else {
      setInternalIsOpen(!internalIsOpen);
    }
  };

  const filteredLogs = useMemo(() => {
    const needle = deferredFilterText.trim();

    const normalize = (s: string) => s.toLocaleLowerCase("en-US");

    // Fuzzy match that supports:
    // - case-insensitive matching (for English)
    // - substring match
    // - subsequence match ("fuzzy" typing: e.g. "clr" matches "clear")
    // - multi-token AND match when input contains spaces
    const isSubsequence = (pattern: string, text: string) => {
      if (!pattern) return true;
      let i = 0;
      for (let j = 0; j < text.length && i < pattern.length; j++) {
        if (text[j] === pattern[i]) i++;
      }
      return i === pattern.length;
    };

    const fuzzyMatch = (pattern: string, text: string) => {
      const p = normalize(pattern);
      const t = normalize(text);
      if (!p) return true;
      return t.includes(p) || isSubsequence(p, t);
    };

    const tokens = needle.split(/\s+/).filter(Boolean);

    // Pre-render messages once per language + logs snapshot.
    const renderedByRaw = new Map<string, string>();
    for (const e of logs) {
      if (!renderedByRaw.has(e.message)) {
        renderedByRaw.set(e.message, renderMessage(e.message));
      }
    }

    return logs.filter((e) => {
      if (levelFilter !== "all" && e.level !== levelFilter) return false;

      if (tokens.length === 0) return true;

      // Only match against the user-visible (rendered) message.
      const rendered = renderedByRaw.get(e.message) ?? "";
      return tokens.every((tok) => fuzzyMatch(tok, rendered));
    });
  }, [
    logs,
    deferredFilterText,
    levelFilter,
    i18n.language,
    i18n.resolvedLanguage,
  ]);

  const formatEntryForCopy = (entry: (typeof logs)[number]) => {
    const msg = renderMessage(entry.message);
    const base = `[${formatTime(entry.ts)}] [${entry.level.toUpperCase()}] [${entry.category}] ${msg}`;
    if (!entry.data) return base;
    const dataStr =
      typeof entry.data === "string"
        ? entry.data
        : JSON.stringify(entry.data, null, 2);
    return `${base}\nData: ${dataStr}`;
  };

  const handleCopyLog = (index: number, text: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setContainerHeight(entries[0].contentRect.height);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [open, panelHeight]);

  const rowHeight = useMemo(() => {
    return density === "compact" ? 60 : 80;
  }, [density]);

  useEffect(() => {
    if (autoScroll && listRef.current && filteredLogs.length > 0) {
      listRef.current.scrollToItem(filteredLogs.length - 1, "end");
    }
  }, [filteredLogs.length, autoScroll, open]);

  const itemData = useMemo(
    () => ({
      logs: filteredLogs,
      densityUi,
      renderMessage,
      formatEntryForCopy,
      t,
      handleCopyLog,
      copiedIndex,
    }),
    [
      filteredLogs,
      densityUi,
      renderMessage,
      formatEntryForCopy,
      t,
      handleCopyLog,
      copiedIndex,
    ],
  );

  const levelTabs: Array<{ id: LogLevel | "all"; label: string }> = [
    { id: "all", label: t("log_panel.level.all") },
    { id: "error", label: t("log_panel.level.error") },
    { id: "warn", label: t("log_panel.level.warn") },
    { id: "info", label: t("log_panel.level.info") },
    { id: "debug", label: t("log_panel.level.debug") },
  ];

  return (
    <>
      {/* Minimized Toggle Button (Visible when closed) */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
          open
            ? "translate-y-24 opacity-0 pointer-events-none scale-75"
            : "translate-y-0 opacity-100 scale-100",
        )}
      >
        <Button
          onClick={toggleOpen}
          className="rounded-full h-14 w-14 shadow-2xl shadow-black/20 bg-background/90 backdrop-blur-xl border border-border/50 hover:bg-primary hover:text-primary-foreground hover:scale-105 transition-all duration-300 group"
          size="icon"
        >
          <div className="relative">
            <Activity className="h-6 w-6 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
            {logs.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-primary border-2 border-background"></span>
              </span>
            )}
          </div>
        </Button>
      </div>

      {/* Main Panel */}
      <div
        style={{ height: open ? panelHeight : 0 }}
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-2xl border-t border-border/50 shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col font-mono text-sm",
          isDragging
            ? "transition-none"
            : "transition-[height] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
          className,
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
          <div className="mx-auto w-24 h-1 rounded-full bg-muted-foreground/20 mt-0.5 group-hover:bg-primary/50 transition-colors" />
        </div>

        {/* Header */}
        <div
          className={cn(
            "flex items-center justify-between bg-muted/20 border-b border-border/50 shrink-0 select-none",
            densityUi.header,
          )}
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "bg-primary/10 flex items-center justify-center text-primary",
                  densityUi.headerTitleIconWrap,
                )}
              >
                <Activity className={densityUi.headerTitleIcon} />
              </div>
              <span className="font-bold tracking-tight text-foreground">
                {t("log_panel.title")}
              </span>
            </div>

            <div className="h-4 w-px bg-border/50 mx-2" />

            <div className={cn("flex items-center gap-2", densityUi.tabsWrap)}>
              {levelTabs.map((tab) => (
                <button
                  key={tab.id}
                  className={cn(
                    "uppercase font-bold rounded-full transition-all border border-transparent",
                    densityUi.tabBtn,
                    levelFilter === tab.id
                      ? "bg-foreground text-background shadow-sm scale-105"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border-border/30 hover:border-border/80",
                  )}
                  onClick={() => setLevelFilter(tab.id)}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex items-center gap-2 bg-background border border-border/50 rounded-lg focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-sm",
                densityUi.searchWrap,
              )}
            >
              <Search
                className={cn("text-muted-foreground", densityUi.searchIcon)}
              />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder={t("log_panel.filter_placeholder")}
                aria-label={t("log_panel.filter_placeholder")}
                className={cn(
                  "bg-transparent border-none w-full focus:outline-none placeholder:text-muted-foreground/50",
                  densityUi.searchInput,
                )}
              />
              {filterText && (
                <button
                  onClick={() => setFilterText("")}
                  className="text-muted-foreground hover:text-foreground"
                  title={t("log_panel.clear_filter_tooltip")}
                >
                  <Trash2 className={densityUi.filterClearIcon} />
                </button>
              )}
            </div>

            <div
              className={cn(
                "flex items-center pl-2 border-l border-border/50",
                densityUi.actionsWrap,
              )}
            >
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "rounded-lg hover:bg-background/80 transition-all",
                  densityUi.actionBtn,
                  autoScroll
                    ? "text-primary bg-primary/10 ring-1 ring-primary/20"
                    : "text-muted-foreground",
                )}
                onClick={() => setAutoScroll(!autoScroll)}
                title={t("log_panel.auto_scroll_tooltip")}
              >
                <ArrowDownCircle className={densityUi.actionIcon} />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors",
                  densityUi.actionBtn,
                )}
                onClick={clearLogs}
                title={t("log_panel.clear_tooltip")}
              >
                <Trash2 className={densityUi.actionIcon} />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "rounded-md hover:bg-muted/40 text-muted-foreground",
                      densityUi.actionBtn,
                    )}
                    title={t("log_panel.density.toggle")}
                  >
                    <Settings2 className={densityUi.actionIcon} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    {t("log_panel.density.label")}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={density}
                    onValueChange={(v) => updateDensity(v as Density)}
                  >
                    <DropdownMenuRadioItem value="compact">
                      {t("log_panel.density.compact")}
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="comfortable">
                      {t("log_panel.density.comfortable")}
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "rounded-lg hover:bg-background/80 text-muted-foreground",
                  densityUi.actionBtn,
                )}
                onClick={toggleOpen}
                title={t("log_panel.minimize_tooltip")}
              >
                <Minimize2 className={densityUi.actionIcon} />
              </Button>
            </div>
          </div>
        </div>

        {/* Log Content */}
        <div
          ref={containerRef}
          className={cn("flex-1 overflow-hidden bg-black/5", densityUi.content)}
        >
          {filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 opacity-50">
              <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center border-2 border-dashed border-muted-foreground/20">
                <Filter className="h-8 w-8" />
              </div>
              <p className="text-sm font-medium">{t("log_panel.no_logs")}</p>
            </div>
          ) : (
            <List
              height={containerHeight}
              itemCount={filteredLogs.length}
              itemSize={rowHeight}
              width="100%"
              ref={listRef}
              itemData={itemData}
              className="scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/40"
            >
              {LogRow}
            </List>
          )}
        </div>
      </div>
    </>
  );
}
