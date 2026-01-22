import { useState, useEffect } from "react";
import { FolderOpen, Terminal, AlertTriangle, CheckCircle, Loader2, GitBranch, Trash2, ChevronDown, RotateCcw, XCircle, HardDrive, Tag } from "lucide-react";
import {
  Button,
  Input,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  cn,
} from "@/components/ui";
import { HeaderControls } from "@/components/HeaderControls";
import { LogPanel } from "@/components/LogPanel";

import { useTranslation } from "react-i18next";

import { addLog, parseLogEvent } from "@/lib/logStore";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";

import { isTauriRuntime } from "@/lib/tauriRuntime";

type Step = "connect" | "analyze" | "confirm" | "execute" | "success";

interface RepoInfo {
  path: string;
  remote_url: string;
  branch_count: number;
  tag_count: number;
  size_human: string;
  detected_default_branch: string | null;
  default_branch_candidates: string[];
  requires_default_branch_choice: boolean;
}

function App() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("connect");
  const [repoPath, setRepoPath] = useState<string>("");
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [targetBranch, setTargetBranch] = useState<string>("");
  const [isLogPanelOpen, setIsLogPanelOpen] = useState(false);

  useEffect(() => {
    if (!isTauriRuntime()) return;

    const unlisten = listen<string>("log-event", (event) => {
      const parsed = parseLogEvent(event.payload);
      addLog({ level: parsed.level, category: "tauri", message: parsed.message });
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });
      if (selected) {
        setRepoPath(selected);
        await analyzeRepo(selected);
      }
    } catch (e) {
      console.error("Dialog failed", e);
    }
  };

  const analyzeRepo = async (path: string) => {
    setIsProcessing(true);
    try {
      const info = await invoke<RepoInfo>("scan_repo", { path });
      setRepoInfo(info);
      // Pick a sensible default for the target branch.
      const inferred =
        info.detected_default_branch ??
        (info.default_branch_candidates.length === 1
          ? info.default_branch_candidates[0]
          : "");
      setTargetBranch(inferred);
      setStep("analyze");
    } catch (err) {
      console.error(err);
      alert(t("analysis.alertFailed", { error: String(err) }));
    } finally {
      setIsProcessing(false);
    }
  };


  const handleExecute = async () => {
    setIsProcessing(true);
    setStep("execute");
    setIsLogPanelOpen(true); // Automatically open logs on start
    addLog({ level: "info", category: "execute", message: "I18N:execute.startingCleanup" });
    addLog({ level: "info", category: "execute", message: "I18N:execute.pleaseWait" });

    const formatInvokeError = (err: unknown) => {
      const raw = String(err);
      const idx = raw.indexOf("I18N:");
      return idx >= 0 ? raw.slice(idx).trim() : raw;
    };

    try {
      await invoke("execute_reset", { path: repoPath, targetBranch });
      setStep("success");
    } catch (err) {
      addLog({ level: "error", category: "execute", message: formatInvokeError(err) });
      // Stay on the execute screen so user can review logs.
      // The LogPanel is always available for deeper inspection.
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartOver = () => {
    // Avoid full reload so global app state (e.g. language) is preserved.
    setIsLogPanelOpen(false);
    setRepoPath("");
    setRepoInfo(null);
    setConfirmText("");
    setIsProcessing(false);
    setTargetBranch("");
    setStep("connect");
    addLog({
      level: "info",
      category: "execute",
      message: "I18N:success.startOver",
    });
  };

  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden font-sans selection:bg-primary/20">
      <LogPanel isOpen={isLogPanelOpen} onToggle={setIsLogPanelOpen} />
      
      {/* Sidebar Navigation */}
      <aside className="w-72 bg-muted/10 border-r border-border/40 flex flex-col p-6 z-20 shrink-0 backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-10">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20 shadow-lg shadow-primary/5">
            <GitBranch className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight">{t("app.title")}</h1>
            <p className="text-xs text-muted-foreground font-medium">{t("app.subtitle")}</p>
          </div>
        </div>

        <nav className="space-y-1 relative flex-1">
          <div className="absolute left-[15px] top-4 bottom-4 w-px bg-border/40 -z-10" />
          
          {[
            { id: "connect", icon: FolderOpen, label: t("selectRepo.title") },
            { id: "analyze", icon: HardDrive, label: t("analysis.title") },
            { id: "confirm", icon: AlertTriangle, label: t("danger.title") },
            { id: "execute", icon: Terminal, label: t("execute.title") },
            { id: "success", icon: CheckCircle, label: t("success.title") },
          ].map((s) => {
            const isActive = step === s.id;
            const stepOrder = ["connect", "analyze", "confirm", "execute", "success"];
            const isPassed = stepOrder.indexOf(step) > stepOrder.indexOf(s.id);
            
            return (
              <div 
                key={s.id} 
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-lg transition-all duration-500",
                  isActive ? "bg-background shadow-sm border border-border/50 translate-x-1" : "hover:bg-muted/30"
                )}
              >
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center border transition-all duration-300 z-10",
                  isActive ? "bg-primary text-primary-foreground border-primary scale-110 shadow-md shadow-primary/20" :
                  isPassed ? "bg-muted text-muted-foreground border-border" : "bg-background border-border text-muted-foreground"
                )}>
                  {isPassed ? <CheckCircle className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                </div>
                <div className="flex flex-col">
                   <span className={cn("text-sm font-semibold transition-colors", isActive ? "text-foreground" : "text-muted-foreground")}>
                     {s.label}
                   </span>
                   {isActive && <span className="text-[10px] text-primary font-medium animate-in fade-in">Current Step</span>}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-muted/20 via-background to-background">
        <div className="absolute top-6 right-6 z-50">
          <HeaderControls />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto scrollbar-none">
          <div className="w-full max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
            
            {step === "connect" && (
              <div className="flex flex-col gap-8 text-center items-center">
                <div className="space-y-3">
                  <h2 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/50">
                    {t("selectRepo.title")}
                  </h2>
                  <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
                    {t("selectRepo.desc")}
                  </p>
                </div>

                <div
                  onClick={isProcessing ? undefined : handleSelectFolder}
                  aria-disabled={isProcessing}
                  className={cn(
                    "w-full aspect-[16/9] max-w-xl rounded-[2rem] border-4 border-dashed flex flex-col items-center justify-center gap-6 transition-all duration-500 cursor-pointer group relative overflow-hidden",
                    isProcessing 
                      ? "border-primary/20 bg-primary/5 pointer-events-none opacity-80" 
                      : "border-muted-foreground/10 hover:border-primary/30 hover:bg-muted/20"
                  )}
                >
                  <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02]" />
                  
                  <div className={cn(
                    "h-24 w-24 rounded-3xl flex items-center justify-center transition-all duration-500 shadow-2xl relative z-10",
                    isProcessing ? "bg-background/80" : "bg-background group-hover:scale-110 group-hover:-rotate-3"
                  )}>
                    {isProcessing ? (
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    ) : (
                      <FolderOpen className="h-10 w-10 text-primary" />
                    )}
                  </div>
                  
                  <div className="space-y-1 relative z-10">
                    <h3 className="font-bold text-xl">
                      {isProcessing ? t("selectRepo.analyzing") : t("selectRepo.browse")}
                    </h3>
                  </div>
                </div>
              </div>
            )}

            {step === "analyze" && repoInfo && (
              <div className="space-y-8">
                <div className="flex items-end justify-between border-b border-border/40 pb-6">
                  <div>
                    <h2 className="text-3xl font-bold flex items-center gap-3">
                      {t("analysis.title")}
                    </h2>
                    <p className="text-muted-foreground mt-2">{t("analysis.desc")}</p>
                  </div>
                  <div className="text-xs font-mono bg-muted/50 px-3 py-1.5 rounded-md border border-border/50 text-muted-foreground flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500/50 animate-pulse" />
                    {repoInfo.remote_url || repoInfo.path}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2 p-8 rounded-3xl border bg-card/40 hover:bg-card/60 transition-colors backdrop-blur-sm shadow-sm flex items-center justify-between group">
                    <div className="space-y-2">
                      <span className="text-xs uppercase text-muted-foreground font-bold tracking-widest">{t("analysis.currentSize")}</span>
                      <div className="text-5xl font-mono font-bold tracking-tighter text-foreground group-hover:text-primary transition-colors">
                        {repoInfo.size_human}
                      </div>
                    </div>
                    <div className="h-16 w-16 rounded-2xl bg-muted/20 flex items-center justify-center">
                        <HardDrive className="h-8 w-8 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </div>

                  <div className="p-6 rounded-3xl border bg-card/40 hover:bg-card/60 transition-colors backdrop-blur-sm shadow-sm group">
                    <div className="flex items-center gap-2 mb-4 text-muted-foreground">
                      <GitBranch className="h-4 w-4" />
                      <span className="text-xs uppercase font-bold tracking-widest">{t("analysis.branches")}</span>
                    </div>
                    <div className="text-4xl font-mono font-bold group-hover:translate-x-1 transition-transform">{repoInfo.branch_count}</div>
                  </div>

                  <div className="p-6 rounded-3xl border bg-card/40 hover:bg-card/60 transition-colors backdrop-blur-sm shadow-sm group">
                    <div className="flex items-center gap-2 mb-4 text-muted-foreground">
                      <Tag className="h-4 w-4" />
                      <span className="text-xs uppercase font-bold tracking-widest">{t("analysis.tags")}</span>
                    </div>
                    <div className="text-4xl font-mono font-bold group-hover:translate-x-1 transition-transform">{repoInfo.tag_count}</div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-4 pt-6">
                  <Button variant="ghost" onClick={() => setStep("connect")} className="hover:bg-muted/50">
                    {t("analysis.back")}
                  </Button>
                  <Button size="lg" onClick={() => setStep("confirm")} className="bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all rounded-xl px-8">
                    {t("analysis.next")}
                    <ChevronDown className="ml-2 h-4 w-4 -rotate-90" />
                  </Button>
                </div>
              </div>
            )}

            {step === "confirm" && (
              <div className="max-w-2xl mx-auto">
                <div className="rounded-[2rem] p-1 bg-gradient-to-b from-destructive/20 to-destructive/5 shadow-2xl shadow-destructive/10">
                  <div className="bg-card rounded-[1.8rem] p-8 space-y-8 border border-destructive/10">
                    <div className="text-center space-y-4">
                      <div className="h-20 w-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto ring-8 ring-destructive/5">
                        <AlertTriangle className="h-10 w-10 text-destructive" />
                      </div>
                      <div>
                         <h2 className="text-3xl font-bold text-destructive mb-2">{t("danger.title")}</h2>
                         <p className="text-muted-foreground text-lg">{t("danger.willIntro")}</p>
                      </div>
                    </div>

                    <div className="space-y-4 bg-muted/30 p-6 rounded-2xl border border-border/50">
                      {[
                        t("danger.will.history"),
                        t("danger.will.branchesTags"),
                        t("danger.will.forcePush")
                      ].map((item, i) => (
                        <div key={i} className="flex items-start gap-3 text-base text-foreground/80">
                           <div className="mt-1 h-5 w-5 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                               <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
                           </div>
                           {item}
                        </div>
                      ))}
                    </div>

                    {repoInfo && (
                      <div className="space-y-3 pt-2">
                        <label className="text-xs uppercase font-bold text-muted-foreground tracking-widest ml-1">{t("danger.targetBranch.label")}</label>
                        <div className="flex gap-2">
                          <div className="relative flex-1 group">
                            <GitBranch className="absolute left-4 top-3 h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                            <Input
                              value={targetBranch}
                              onChange={(e) => setTargetBranch(e.target.value)}
                              placeholder={t("danger.targetBranch.placeholder")}
                              className="pl-11 h-12 font-mono bg-background/50 border-input/50 focus:border-primary/50 transition-all rounded-xl"
                            />
                          </div>
                          {repoInfo.default_branch_candidates.length > 1 && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-input/50"><ChevronDown className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {repoInfo.default_branch_candidates.map(c => (
                                  <DropdownMenuItem key={c} onClick={() => setTargetBranch(c)} className="font-mono">{c}</DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground ml-1 flex items-center gap-1.5">
                           <GitBranch className="h-3 w-3" />
                           {repoInfo.requires_default_branch_choice
                             ? t("danger.targetBranch.hint.required")
                             : t("danger.targetBranch.hint.detected")}
                        </p>
                      </div>
                    )}

                    <div className="space-y-4 pt-6 border-t border-border/40">
                      <div className="space-y-2 text-center">
                        <label className="text-sm font-medium block">
                          {t("danger.confirmPrefix")} <span className="text-destructive font-bold font-mono select-all bg-destructive/5 px-2 py-0.5 rounded">"{t("danger.confirmPhrase")}"</span> {t("danger.confirmSuffix")}
                        </label>
                        <Input
                          value={confirmText}
                          onChange={(e) => setConfirmText(e.target.value)}
                          placeholder={t("danger.confirmPhrase")}
                          className="border-destructive/30 focus-visible:ring-destructive/50 font-mono text-center text-xl h-14 tracking-wide bg-destructive/5 rounded-xl transition-all focus:scale-[1.02]"
                        />
                      </div>
                    </div>

                    <div className="flex gap-4 pt-2">
                      <Button variant="ghost" size="lg" className="flex-1 rounded-xl" onClick={() => setStep("analyze")}>
                        {t("danger.cancel")}
                      </Button>
                      <Button
                        variant="destructive"
                        size="lg"
                        className="flex-1 shadow-xl shadow-destructive/20 rounded-xl hover:scale-[1.02] transition-all"
                        disabled={confirmText !== "nuclear reset" || targetBranch.trim().length === 0}
                        onClick={handleExecute}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t("danger.execute")}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === "execute" && (
              <div className="flex flex-col items-center justify-center text-center space-y-10 max-w-lg mx-auto">
                <div className="relative">
                  <div className={cn(
                    "h-40 w-40 rounded-full flex items-center justify-center border-4 transition-all duration-700",
                    isProcessing ? "border-primary/20 border-t-primary" : "border-destructive/20 border-t-destructive"
                  )}>
                    {isProcessing ? (
                      <div className="relative">
                          <Loader2 className="h-16 w-16 text-primary animate-spin" />
                          <div className="absolute inset-0 blur-xl bg-primary/40 -z-10 animate-pulse" />
                      </div>
                    ) : (
                      <XCircle className="h-16 w-16 text-destructive" />
                    )}
                  </div>
                  {isProcessing && <div className="absolute inset-0 rounded-full animate-ping bg-primary/5 -z-10 duration-1000" />}
                </div>

                <div className="space-y-3">
                  <h2 className="text-3xl font-bold">
                    {isProcessing ? t("execute.status.running") : t("execute.status.failed")}
                  </h2>
                  {!isProcessing && (
                    <p className="text-destructive font-medium bg-destructive/5 px-4 py-2 rounded-lg inline-block">
                        {t("execute.status.failedDesc")}
                    </p>
                  )}
                </div>

                <div className="flex flex-col w-full gap-3">
                    <div className="flex gap-3 w-full">
                        <Button variant="outline" size="lg" className="flex-1 rounded-xl border-primary/20 hover:bg-primary/5 text-primary" onClick={() => setIsLogPanelOpen(!isLogPanelOpen)}>
                            <Terminal className="mr-2 h-4 w-4" />
                            {isLogPanelOpen ? t("app.hideLogs") : t("execute.viewLogs")}
                        </Button>
                        {!isProcessing && (
                            <Button size="lg" className="flex-1 rounded-xl" onClick={handleExecute}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            {t("execute.retry")}
                            </Button>
                        )}
                    </div>
                    {!isProcessing && (
                        <Button variant="ghost" size="sm" onClick={handleStartOver} className="text-muted-foreground">
                            {t("execute.startOver")}
                        </Button>
                    )}
                </div>
              </div>
            )}

            {step === "success" && (
              <div className="text-center space-y-8 py-12">
                <div className="inline-flex relative mb-4">
                  <div className="h-32 w-32 bg-green-500/10 rounded-full flex items-center justify-center ring-1 ring-green-500/20 text-green-500 animate-in zoom-in duration-500">
                    <CheckCircle className="h-16 w-16" />
                  </div>
                  <div className="absolute inset-0 bg-green-500/20 blur-2xl -z-10 rounded-full" />
                </div>
                
                <div className="space-y-6 max-w-lg mx-auto">
                  <h2 className="text-4xl font-bold tracking-tight text-foreground">{t("success.title")}</h2>
                  <p className="text-xl text-muted-foreground">{t("success.desc")}</p>
                  <div className="p-6 bg-gradient-to-br from-muted/50 to-muted/20 rounded-2xl border border-border/50 text-sm text-muted-foreground leading-relaxed">
                    {t("success.remoteCleanNote")}
                  </div>
                </div>

                <div className="flex justify-center gap-4 pt-4">
                  <Button variant="outline" size="lg" className="rounded-xl min-w-[160px]" onClick={() => setIsLogPanelOpen(!isLogPanelOpen)}>
                    {isLogPanelOpen ? t("app.hideLogs") : t("success.viewLogs")}
                  </Button>
                  <Button size="lg" onClick={handleStartOver} className="bg-green-600 hover:bg-green-700 text-white shadow-xl shadow-green-600/20 rounded-xl min-w-[160px] hover:scale-105 transition-all">
                    {t("success.startOver")}
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
