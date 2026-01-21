import { useState, useEffect } from "react";
import { FolderOpen, Terminal, AlertTriangle, CheckCircle, Loader2, GitBranch, Trash2, ChevronDown, RotateCcw, XCircle } from "lucide-react";
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
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 relative">
      <LogPanel isOpen={isLogPanelOpen} onToggle={setIsLogPanelOpen} />
      <HeaderControls />
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center space-y-2">
           <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
             <GitBranch className="h-6 w-6 text-primary drop-shadow-[0_1px_0_hsl(var(--background))] dark:drop-shadow-[0_1px_0_rgba(255,255,255,0.15)]" />
           </div>
           <h1 className="text-3xl font-bold tracking-tight">{t("app.title")}</h1>
           <p className="text-muted-foreground">{t("app.subtitle")}</p>
        </div>

        {step === "connect" && (
            <Card>
                <CardHeader>
                    <CardTitle>{t("selectRepo.title")}</CardTitle>
                    <CardDescription>{t("selectRepo.desc")}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
                    <Button size="lg" onClick={handleSelectFolder} disabled={isProcessing}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FolderOpen className="mr-2 h-4 w-4" />}
                        {isProcessing ? t("selectRepo.analyzing") : t("selectRepo.browse")}
                    </Button>
                </CardContent>
            </Card>
        )}

        {step === "analyze" && repoInfo && (
            <Card>
                <CardHeader>
                    <CardTitle>{t("analysis.title")}</CardTitle>
                    <CardDescription>{t("analysis.desc")}</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                        <div className="text-sm font-medium text-muted-foreground">{t("analysis.remoteUrl")}</div>
                        <div className="font-mono text-sm truncate">{repoInfo.remote_url}</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                        <div className="text-sm font-medium text-muted-foreground">{t("analysis.currentSize")}</div>
                        <div className="text-xl font-bold">{repoInfo.size_human}</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                        <div className="text-sm font-medium text-muted-foreground">{t("analysis.branches")}</div>
                        <div className="text-xl font-bold">{repoInfo.branch_count}</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                        <div className="text-sm font-medium text-muted-foreground">{t("analysis.tags")}</div>
                        <div className="text-xl font-bold">{repoInfo.tag_count}</div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="ghost" onClick={() => setStep("connect")}>{t("analysis.back")}</Button>
                    <Button onClick={() => setStep("confirm")}>{t("analysis.next")}</Button>
                </CardFooter>
            </Card>
        )}

        {step === "confirm" && (
            <Card className="border-destructive/50">
                <CardHeader>
                    <CardTitle className="text-destructive flex items-center">
                        <AlertTriangle className="mr-2 h-5 w-5" />
                        {t("danger.title")}
                    </CardTitle>
                    <CardDescription>
                        {t("danger.willIntro")}
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>{t("danger.will.history")}</li>
                            <li>{t("danger.will.branchesTags")}</li>
                            <li>{t("danger.will.forcePush")}</li>
                        </ul>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {repoInfo && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          {t("danger.targetBranch.label")}
                        </label>
                         <div className="flex gap-2">
                           <Input
                             value={targetBranch}
                             onChange={(e) => setTargetBranch(e.target.value)}
                             placeholder={t("danger.targetBranch.placeholder")}
                             className="flex-1"
                           />
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
                                   <DropdownMenuItem key={c} onClick={() => setTargetBranch(c)}>
                                     {c}
                                   </DropdownMenuItem>
                                 ))}
                               </DropdownMenuContent>
                             </DropdownMenu>
                           )}
                         </div>
                        <p className="text-xs text-muted-foreground">
                          {repoInfo.requires_default_branch_choice
                            ? t("danger.targetBranch.hint.required")
                            : t("danger.targetBranch.hint.detected")}
                        </p>
                      </div>
                    )}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            {t("danger.confirmPrefix")} <span className="font-mono font-bold select-all">{t("danger.confirmPhrase")}</span> {t("danger.confirmSuffix")}
                        </label>
                        <Input 
                            value={confirmText} 
                            onChange={(e) => setConfirmText(e.target.value)} 
                            placeholder={t("danger.confirmPlaceholder")}
                            className="border-destructive/30 focus-visible:ring-destructive"
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="ghost" onClick={() => setStep("analyze")}>{t("danger.cancel")}</Button>
                    <Button 
                        variant="destructive" 
                        disabled={confirmText !== "nuclear reset" || targetBranch.trim().length === 0}
                        onClick={handleExecute}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t("danger.execute")}
                    </Button>
                </CardFooter>
            </Card>
        )}

        {step === "execute" && (
            <Card className={isProcessing ? "border-primary/20" : "border-destructive/50"}>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        {isProcessing ? (
                           <>
                             <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
                             {t("execute.status.running")}
                           </>
                        ) : (
                           <>
                             <XCircle className="mr-2 h-5 w-5 text-destructive" />
                             <span className="text-destructive">{t("execute.status.failed")}</span>
                           </>
                        )}
                    </CardTitle>
                    {!isProcessing && (
                      <CardDescription>
                         {t("execute.status.failedDesc")}
                      </CardDescription>
                    )}
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-8">
                   {/* Visual indicator of state */}
                   <div className="h-24 w-24 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
                      {isProcessing ? (
                        <Terminal className="h-10 w-10 text-muted-foreground animate-pulse" />
                      ) : (
                        <AlertTriangle className="h-10 w-10 text-destructive" />
                      )}
                   </div>
                   
                   <Button
                      variant="outline"
                      onClick={() => setIsLogPanelOpen(!isLogPanelOpen)}
                      className="mt-2"
                   >
                      <Terminal className="mr-2 h-4 w-4" />
                      {isLogPanelOpen ? t("app.hideLogs") : t("execute.viewLogs")}
                   </Button>
                </CardContent>
                <CardFooter className="flex justify-between bg-muted/20">
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
            </Card>
        )}

        {step === "success" && (
            <Card className="border-green-500/50">
                 <CardHeader>
                    <CardTitle className="text-green-600 flex items-center">
                        <CheckCircle className="mr-2 h-5 w-5" />
                        {t("success.title")}
                    </CardTitle>
                    <CardDescription>
                        {t("success.desc")}
                    </CardDescription>
                </CardHeader>
                 <CardContent>
                     <p className="mb-4">
                         {t("success.remoteCleanNote")}
                     </p>
                     <div className="flex gap-2">
                       <Button
                         onClick={() => setIsLogPanelOpen(!isLogPanelOpen)}
                         variant="outline"
                       >
                         {isLogPanelOpen ? t("app.hideLogs") : t("success.viewLogs")}
                       </Button>
                     <Button
                       onClick={handleStartOver}
                       variant="outline"
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
