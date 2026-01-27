import { Loader2, XCircle, Terminal, RotateCcw } from "lucide-react";
import { Button, cn } from "@/components/ui";
import { useTranslation } from "react-i18next";

interface ExecuteStepProps {
  isProcessing: boolean;
  isLogPanelOpen: boolean;
  onToggleLogPanel: () => void;
  onRetry: () => void;
  onStartOver: () => void;
}

export function ExecuteStep({
  isProcessing,
  isLogPanelOpen,
  onToggleLogPanel,
  onRetry,
  onStartOver,
}: ExecuteStepProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center text-center space-y-10 max-w-lg mx-auto">
      <div className="relative">
        <div
          className={cn(
            "h-40 w-40 rounded-full flex items-center justify-center border-4 transition-all duration-700",
            isProcessing
              ? "border-primary/20 border-t-primary"
              : "border-destructive/20 border-t-destructive"
          )}
        >
          {isProcessing ? (
            <div className="relative">
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
              <div className="absolute inset-0 blur-xl bg-primary/40 -z-10 animate-pulse" />
            </div>
          ) : (
            <XCircle className="h-16 w-16 text-destructive" />
          )}
        </div>
        {isProcessing && (
          <div className="absolute inset-0 rounded-full animate-ping bg-primary/5 -z-10 duration-1000" />
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-3xl font-bold">
          {isProcessing
            ? t("execute.status.running")
            : t("execute.status.failed")}
        </h2>
        {!isProcessing && (
          <p className="text-destructive font-medium bg-destructive/5 px-4 py-2 rounded-lg inline-block">
            {t("execute.status.failedDesc")}
          </p>
        )}
      </div>

      <div className="flex flex-col w-full gap-3">
        <div className="flex gap-3 w-full">
          <Button
            variant="outline"
            size="lg"
            className="flex-1 rounded-xl border-primary/20 hover:bg-primary/5 text-primary"
            onClick={onToggleLogPanel}
          >
            <Terminal className="mr-2 h-4 w-4" />
            {isLogPanelOpen ? t("app.hideLogs") : t("execute.viewLogs")}
          </Button>
          {!isProcessing && (
            <Button
              size="lg"
              className="flex-1 rounded-xl"
              onClick={onRetry}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {t("execute.retry")}
            </Button>
          )}
        </div>
        {!isProcessing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onStartOver}
            className="text-muted-foreground"
          >
            {t("execute.startOver")}
          </Button>
        )}
      </div>
    </div>
  );
}
