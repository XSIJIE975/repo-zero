import { useEffect } from "react";
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

function App() {
  const wizard = useWizard();

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

  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden font-sans selection:bg-primary/20">
      <LogPanel
        isOpen={wizard.isLogPanelOpen}
        onToggle={wizard.setIsLogPanelOpen}
      />

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
                onSelectFolder={wizard.handleSelectFolder}
                validationError={null}
                selectedPath={wizard.repoPath || null}
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
