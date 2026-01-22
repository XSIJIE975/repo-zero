import { useState, useEffect } from "react";
import { FolderOpen, Terminal, AlertTriangle, CheckCircle, Loader2, GitBranch, Trash2, ChevronDown, RotateCcw, XCircle, HardDrive, GitCommit, Tag, Clock } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-tr from-background via-transparent to-background pointer-events-none" />
      
      <LogPanel isOpen={isLogPanelOpen} onToggle={setIsLogPanelOpen} />
      <HeaderControls />
      
      <div className="w-full max-w-xl z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-10 text-center space-y-4">
           <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20 shadow-lg mb-2">
             <GitBranch className="h-8 w-8 text-primary drop-shadow-sm" />
           </div>
           <div>
             <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">{t("app.title")}</h1>
             <p className="text-muted-foreground text-lg mt-2">{t("app.subtitle")}</p>
           </div>
        </div>

        {step === "connect" && (
            <Card className="border-border/50 shadow-xl shadow-black/5 overflow-hidden backdrop-blur-sm bg-card/95">
                <CardHeader className="text-center pb-2">
                    <CardTitle className="text-xl">{t("selectRepo.title")}</CardTitle>
                    <CardDescription>{t("selectRepo.desc")}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-10 px-6">
                    <Button 
                      variant="outline"
                      size="lg" 
                      onClick={handleSelectFolder} 
                      disabled={isProcessing}
                      className="w-full h-32 border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 flex flex-col gap-3 rounded-xl group"
                    >
                        {isProcessing ? (
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        ) : (
                          <FolderOpen className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors group-hover:scale-110 duration-300" />
                        )}
                        <span className="text-lg font-medium text-muted-foreground group-hover:text-foreground">
                          {isProcessing ? t("selectRepo.analyzing") : t("selectRepo.browse")}
                        </span>
                    </Button>
                </CardContent>
            </Card>
        )}

        {step === "analyze" && repoInfo && (
            <Card className="border-border/50 shadow-xl shadow-black/5 overflow-hidden backdrop-blur-sm bg-card/95">
                <CardHeader className="border-b border-border/50 bg-muted/30 pb-6">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <HardDrive className="w-5 h-5 text-primary" />
                      {t("analysis.title")}
                    </CardTitle>
                    <CardDescription>{t("analysis.desc")}</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 p-4 border rounded-lg bg-background/50 hover:bg-background transition-colors">
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t("analysis.remoteUrl")}</div>
                            <div className="font-mono text-sm truncate text-foreground/90">{repoInfo.remote_url || "No remote detected"}</div>
                        </div>
                        <div className="p-4 border rounded-lg bg-background/50 hover:bg-background transition-colors">
                            <div className="flex items-center gap-2 mb-2">
                                <HardDrive className="w-4 h-4 text-muted-foreground" />
                                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("analysis.currentSize")}</div>
                            </div>
                            <div className="text-2xl font-bold font-mono tracking-tight">{repoInfo.size_human}</div>
                        </div>
                        <div className="p-4 border rounded-lg bg-background/50 hover:bg-background transition-colors">
                             <div className="flex items-center gap-2 mb-2">
                                <GitBranch className="w-4 h-4 text-muted-foreground" />
                                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("analysis.branches")}</div>
                            </div>
                            <div className="text-2xl font-bold font-mono tracking-tight">{repoInfo.branch_count}</div>
                        </div>
                        <div className="p-4 border rounded-lg bg-background/50 hover:bg-background transition-colors">
                             <div className="flex items-center gap-2 mb-2">
                                <Tag className="w-4 h-4 text-muted-foreground" />
                                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("analysis.tags")}</div>
                            </div>
                            <div className="text-2xl font-bold font-mono tracking-tight">{repoInfo.tag_count}</div>
                        </div>
                         {/* Placeholder for future metric */}
                         <div className="p-4 border rounded-lg bg-background/50 hover:bg-background transition-colors opacity-50">
                             <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Est. Time</div>
                            </div>
                            <div className="text-lg font-bold font-mono tracking-tight text-muted-foreground">--:--</div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between bg-muted/30 p-6 border-t border-border/50">
                    <Button variant="ghost" onClick={() => setStep("connect")} className="hover:bg-background">{t("analysis.back")}</Button>
                    <Button onClick={() => setStep("confirm")} className="shadow-sm">{t("analysis.next")}</Button>
                </CardFooter>
            </Card>
        )}

        {step === "confirm" && (
            <Card className="border-destructive/40 shadow-xl shadow-destructive/5 overflow-hidden backdrop-blur-sm bg-card/95">
                <CardHeader className="bg-destructive/5 border-b border-destructive/10 pb-6">
                    <CardTitle className="text-destructive flex items-center text-xl">
                        <AlertTriangle className="mr-3 h-6 w-6" />
                        {t("danger.title")}
                    </CardTitle>
                    <CardDescription className="text-destructive/80 mt-2">
                        {t("danger.willIntro")}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                    <div className="bg-destructive/5 p-4 rounded-lg border border-destructive/10 text-sm text-destructive/90">
                        <ul className="space-y-2 list-none">
                            <li className="flex items-start gap-2">
                                <span className="block mt-1.5 w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                                {t("danger.will.history")}
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="block mt-1.5 w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                                {t("danger.will.branchesTags")}
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="block mt-1.5 w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                                {t("danger.will.forcePush")}
                            </li>
                        </ul>
                    </div>

                    {repoInfo && (
                      <div className="space-y-3">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          {t("danger.targetBranch.label")}
                        </label>
                         <div className="flex gap-2">
                           <div className="relative flex-1">
                               <GitBranch className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                               <Input
                                 value={targetBranch}
                                 onChange={(e) => setTargetBranch(e.target.value)}
                                 placeholder={t("danger.targetBranch.placeholder")}
                                 className="pl-9 font-mono bg-background"
                               />
                           </div>
                           {repoInfo.default_branch_candidates.length > 1 && (
                             <DropdownMenu>
                               <DropdownMenuTrigger asChild>
                                 <Button
                                   variant="outline"
                                   size="icon"
                                   className="shrink-0"
                                   aria-label={t("danger.targetBranch.dropdownLabel")}
                                 >
                                   <ChevronDown className="h-4 w-4" />
                                 </Button>
                               </DropdownMenuTrigger>
                               <DropdownMenuContent align="end">
                                 {repoInfo.default_branch_candidates.map((c) => (
                                   <DropdownMenuItem key={c} onClick={() => setTargetBranch(c)} className="font-mono">
                                     {c}
                                   </DropdownMenuItem>
                                 ))}
                               </DropdownMenuContent>
                             </DropdownMenu>
                           )}
                         </div>
                        <p className="text-[10px] text-muted-foreground/80 flex items-center gap-1.5">
                          <GitCommit className="h-3 w-3" />
                          {repoInfo.requires_default_branch_choice
                            ? t("danger.targetBranch.hint.required")
                            : t("danger.targetBranch.hint.detected")}
                        </p>
                      </div>
                    )}

                    <div className="space-y-3 pt-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                            {t("danger.confirmPrefix")} <span className="font-mono font-bold select-all text-destructive">{t("danger.confirmPhrase")}</span> {t("danger.confirmSuffix")}
                        </label>
                        <Input 
                            value={confirmText} 
                            onChange={(e) => setConfirmText(e.target.value)} 
                            placeholder={t("danger.confirmPlaceholder")}
                            className="border-destructive/30 focus-visible:ring-destructive bg-destructive/5 font-mono placeholder:text-destructive/30 text-destructive font-medium"
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between bg-destructive/5 p-6 border-t border-destructive/10">
                    <Button variant="ghost" onClick={() => setStep("analyze")} className="hover:bg-destructive/10 hover:text-destructive">{t("danger.cancel")}</Button>
                    <Button 
                        variant="destructive" 
                        disabled={confirmText !== "nuclear reset" || targetBranch.trim().length === 0}
                        onClick={handleExecute}
                        className="shadow-lg shadow-destructive/20"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t("danger.execute")}
                    </Button>
                </CardFooter>
            </Card>
        )}

        {step === "execute" && (
            <Card className={`overflow-hidden backdrop-blur-sm bg-card/95 transition-all duration-500 ${isProcessing ? "border-primary/20 shadow-primary/5 shadow-xl" : "border-destructive/40 shadow-destructive/10 shadow-xl"}`}>
                <CardHeader className="text-center pb-2">
                    <CardTitle className="flex items-center justify-center text-xl">
                        {isProcessing ? (
                           <div className="flex flex-col items-center gap-2">
                             <span className="text-primary">{t("execute.status.running")}</span>
                           </div>
                        ) : (
                           <div className="flex flex-col items-center gap-2 text-destructive">
                             <span className="flex items-center gap-2"><XCircle className="h-5 w-5" /> {t("execute.status.failed")}</span>
                           </div>
                        )}
                    </CardTitle>
                    {!isProcessing && (
                      <CardDescription className="text-destructive/80 font-medium mt-1">
                         {t("execute.status.failedDesc")}
                      </CardDescription>
                    )}
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-10">
                   <div className={`relative h-28 w-28 rounded-full flex items-center justify-center mb-8 ${isProcessing ? "bg-primary/10 ring-1 ring-primary/20" : "bg-destructive/10 ring-1 ring-destructive/20"}`}>
                      {isProcessing ? (
                        <>
                            <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                            <Terminal className="h-10 w-10 text-primary animate-pulse" />
                        </>
                      ) : (
                        <AlertTriangle className="h-12 w-12 text-destructive" />
                      )}
                   </div>
                   
                   <Button
                      variant="outline"
                      onClick={() => setIsLogPanelOpen(!isLogPanelOpen)}
                      className="mt-2 min-w-[200px]"
                   >
                      <Terminal className="mr-2 h-4 w-4" />
                      {isLogPanelOpen ? t("app.hideLogs") : t("execute.viewLogs")}
                   </Button>
                </CardContent>
                {!isProcessing && (
                    <CardFooter className="flex justify-between bg-muted/30 p-6 border-t border-border/50">
                        <Button 
                          variant="ghost" 
                          onClick={handleStartOver}
                          disabled={isProcessing}
                        >
                          <FolderOpen className="mr-2 h-4 w-4" />
                          {t("execute.startOver")}
                        </Button>
                        <Button 
                          variant="default"
                          onClick={handleExecute}
                          disabled={isProcessing}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          {t("execute.retry")}
                        </Button>
                    </CardFooter>
                )}
            </Card>
        )}

        {step === "success" && (
            <Card className="border-green-500/30 shadow-xl shadow-green-500/10 overflow-hidden backdrop-blur-sm bg-card/95">
                 <CardHeader className="text-center bg-green-500/5 border-b border-green-500/10 pb-6">
                    <CardTitle className="text-green-600 dark:text-green-400 flex flex-col items-center gap-3 text-2xl">
                        <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center ring-1 ring-green-500/20">
                            <CheckCircle className="h-8 w-8 text-green-500" />
                        </div>
                        {t("success.title")}
                    </CardTitle>
                    <CardDescription className="text-green-600/80 dark:text-green-400/70 mt-2 text-base">
                        {t("success.desc")}
                    </CardDescription>
                </CardHeader>
                 <CardContent className="p-8 text-center">
                     <p className="text-muted-foreground mb-6 leading-relaxed">
                         {t("success.remoteCleanNote")}
                     </p>
                     <div className="flex gap-3 justify-center">
                       <Button
                         onClick={() => setIsLogPanelOpen(!isLogPanelOpen)}
                         variant="outline"
                         className="min-w-[140px]"
                       >
                         {isLogPanelOpen ? t("app.hideLogs") : t("success.viewLogs")}
                       </Button>
                       <Button
                         onClick={handleStartOver}
                         variant="default"
                         className="min-w-[140px] bg-green-600 hover:bg-green-700 text-white"
                       >
                         {t("success.startOver")}
                       </Button>
                     </div>
                  </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}

export default App;
