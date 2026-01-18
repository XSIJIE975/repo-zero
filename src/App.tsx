import { useState, useEffect, useSyncExternalStore, useMemo } from "react";
import { FolderOpen, Terminal, AlertTriangle, CheckCircle, Loader2, GitBranch, Trash2 } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input } from "@/components/ui";
import { HeaderControls } from "@/components/HeaderControls";
import { LogPanel } from "@/components/LogPanel";

import { useTranslation } from "react-i18next";

import { addLog, getLogSnapshot, parseLogEvent, subscribeLogs } from "@/lib/logStore";
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
}

function App() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("connect");
  const [repoPath, setRepoPath] = useState<string>("");
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const logSnapshot = useSyncExternalStore(subscribeLogs, getLogSnapshot, getLogSnapshot);

  const execLogs = useMemo(() => {
    return logSnapshot.entries
      .filter((e) => e.category === "tauri" || e.category === "execute")
      .map((e) => (e.level === "error" ? `ERROR: ${e.message}` : e.message));
  }, [logSnapshot.entries]);

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
      setStep("analyze");
    } catch (err) {
      console.error(err);
      alert(t("analysis.alertFailed", { error: String(err) }));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecute = async () => {
    setStep("execute");
    addLog({ level: "info", category: "execute", message: t("execute.startingCleanup") });
    addLog({ level: "info", category: "execute", message: t("execute.pleaseWait") });

    try {
      await invoke("execute_reset", { path: repoPath });
      setStep("success");
    } catch (err) {
      addLog({ level: "error", category: "execute", message: String(err) });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 relative">
      <LogPanel />
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
                        disabled={confirmText !== "nuclear reset"}
                        onClick={handleExecute}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t("danger.execute")}
                    </Button>
                </CardFooter>
            </Card>
        )}

        {step === "execute" && (
            <Card className="bg-black text-green-500 border-zinc-800 font-mono">
                <CardHeader className="border-b border-zinc-800 pb-2">
                    <CardTitle className="text-sm flex items-center">
                        <Terminal className="mr-2 h-4 w-4" />
                        {t("execute.title")}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="h-64 overflow-y-auto p-4 space-y-1 text-xs">
                        {execLogs.map((log, i) => (
                            <div key={i}>&gt; {log}</div>
                        ))}
                    </div>
                </CardContent>
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
                    <Button onClick={() => window.location.reload()} variant="outline">{t("success.startOver")}</Button>
                 </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}

export default App;
