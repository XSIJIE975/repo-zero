import { useEffect, useState } from "react";
import { cn } from "@/components/ui";
import { HeaderControls } from "@/components/HeaderControls";
import { LogPanel } from "@/components/LogPanel";
import { Sidebar } from "@/components/Sidebar";
import { ConnectStep } from "@/components/ConnectStep";
import { AnalyzeStep } from "@/components/AnalyzeStep";
import { ConfirmStep } from "@/components/ConfirmStep";
import { ExecuteStep } from "@/components/ExecuteStep";
import { SuccessStep } from "@/components/SuccessStep";
import { useWizard } from "@/hooks/useWizard";
import { addLog, parseLogEvent } from "@/lib/logStore";
import { listen } from "@tauri-apps/api/event";
import { isTauriRuntime } from "@/lib/tauriRuntime";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { GitNotInstalledPage } from "@/components/GitNotInstalledPage";
import { RepoInfo } from "@/types/wizard";
import { useUpdater } from "@/hooks/useUpdater";
import { UpdateToast } from "@/components/UpdateToast";

function App() {
  const wizard = useWizard();
  const { t } = useTranslation();
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const { status: updateStatus, updateInfo, checkForUpdate } = useUpdater();
  const [showUpdateToast, setShowUpdateToast] = useState(false);

  useEffect(() => {
    wizard.checkGitStatus();
  }, []);

  // Update check
  useEffect(() => {
    const timer = setTimeout(() => {
      checkForUpdate();
    }, 3000);
    return () => clearTimeout(timer);
  }, [checkForUpdate]);

  useEffect(() => {
    if (updateStatus === "available") {
      setShowUpdateToast(true);
    }
  }, [updateStatus]);

  useEffect(() => {
    if (!isTauriRuntime()) return;

    const unlisten = listen<string>("log-event", (event) => {
      const parsed = parseLogEvent(event.payload);
      addLog({
        level: parsed.level,
        category: "tauri",
        message: parsed.message,
      });
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  const analyzeRepo = async (path: string) => {
    wizard.setIsProcessing(true);
    wizard.setIsLogPanelOpen(false);
    try {
      const info = await invoke<RepoInfo>("scan_repo", { path });
      wizard.setRepoInfo(info);
      
      const inferred =
        info.detected_default_branch ??
        (info.default_branch_candidates.length === 1
          ? info.default_branch_candidates[0]
          : "");
      wizard.setTargetBranch(inferred);
      wizard.setStep("analyze");
      setValidationError(null);
    } catch (err) {
      const errStr = String(err);
      if (errStr.includes("I18N:validation.notGitRepo")) {
        setValidationError("notGitRepo");
      } else {
        console.error(err);
        alert(t("analysis.alertFailed", { error: errStr }));
      }
    } finally {
      wizard.setIsProcessing(false);
    }
  };

  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });
      if (selected) {
        wizard.setRepoPath(selected);
        setSelectedPath(selected);
        setValidationError(null);
        await analyzeRepo(selected);
      }
    } catch (e) {
      console.error("Dialog failed", e);
    }
  };

  if (wizard.gitStatus.status === "checking") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (wizard.gitStatus.status === "missing") {
    return (
      <GitNotInstalledPage
        onRetry={wizard.checkGitStatus}
        isChecking={false}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden font-sans selection:bg-primary/20">
      <LogPanel
        isOpen={wizard.isLogPanelOpen}
        onToggle={wizard.setIsLogPanelOpen}
      />

      {showUpdateToast && updateInfo && (
        <UpdateToast 
          updateInfo={updateInfo} 
          onClose={() => setShowUpdateToast(false)} 
        />
      )}

      <Sidebar currentStep={wizard.step} />

      <main className="flex-1 flex flex-col relative bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-muted/20 via-background to-background">
        <div className="absolute top-6 right-6 z-50">
          <HeaderControls />
        </div>

        <div
          className={cn(
            "flex-1 flex flex-col items-center w-full overflow-y-auto p-4 md:p-8",
            wizard.step === "confirm" ? "justify-start" : "justify-center",
          )}
        >
          <div
            className={cn(
              "w-full max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out flex-shrink-0",
              wizard.step === "confirm" ? "py-4 md:py-12" : "",
            )}
          >
            {wizard.step === "connect" && (
              <ConnectStep
                isProcessing={wizard.isProcessing}
                onSelectFolder={handleSelectFolder}
                validationError={validationError}
                selectedPath={selectedPath}
                gitVersionWarning={wizard.gitStatus.status === "available" && !wizard.gitStatus.meetsMinimum}
                gitVersion={wizard.gitStatus.status === "available" ? wizard.gitStatus.version : null}
              />
            )}

            {wizard.step === "analyze" && wizard.repoInfo && (
              <AnalyzeStep
                repoInfo={wizard.repoInfo}
                onBack={() => wizard.setStep("connect")}
                onNext={() => wizard.setStep("confirm")}
              />
            )}

            {wizard.step === "confirm" && wizard.repoInfo && (
              <ConfirmStep
                repoInfo={wizard.repoInfo}
                targetBranch={wizard.targetBranch}
                confirmText={wizard.confirmText}
                onTargetBranchChange={wizard.setTargetBranch}
                onConfirmTextChange={wizard.setConfirmText}
                onBack={() => wizard.setStep("analyze")}
                onExecute={wizard.handleExecute}
              />
            )}

            {wizard.step === "execute" && (
              <ExecuteStep
                isProcessing={wizard.isProcessing}
                isLogPanelOpen={wizard.isLogPanelOpen}
                onToggleLogPanel={() =>
                  wizard.setIsLogPanelOpen(!wizard.isLogPanelOpen)
                }
                onRetry={wizard.handleExecute}
                onStartOver={wizard.handleStartOver}
              />
            )}

            {wizard.step === "success" && (
              <SuccessStep
                isLogPanelOpen={wizard.isLogPanelOpen}
                onToggleLogPanel={() =>
                  wizard.setIsLogPanelOpen(!wizard.isLogPanelOpen)
                }
                onStartOver={wizard.handleStartOver}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
