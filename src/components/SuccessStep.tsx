import { CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui";

interface SuccessStepProps {
  isLogPanelOpen: boolean;
  onToggleLogPanel: () => void;
  onStartOver: () => void;
}

export function SuccessStep({
  isLogPanelOpen,
  onToggleLogPanel,
  onStartOver,
}: SuccessStepProps) {
  const { t } = useTranslation();

  return (
    <div className="text-center space-y-8 py-12">
      <div className="inline-flex relative mb-4">
        <div className="h-32 w-32 bg-green-500/10 rounded-full flex items-center justify-center ring-1 ring-green-500/20 text-green-500 animate-in zoom-in duration-500">
          <CheckCircle className="h-16 w-16" />
        </div>
        <div className="absolute inset-0 bg-green-500/20 blur-2xl -z-10 rounded-full" />
      </div>

      <div className="space-y-6 max-w-lg mx-auto">
        <h2 className="text-4xl font-bold tracking-tight text-foreground">
          {t("success.title")}
        </h2>
        <p className="text-xl text-muted-foreground">{t("success.desc")}</p>
        <div className="p-6 bg-gradient-to-br from-muted/50 to-muted/20 rounded-2xl border border-border/50 text-sm text-muted-foreground leading-relaxed">
          {t("success.remoteCleanNote")}
        </div>
      </div>

      <div className="flex justify-center gap-4 pt-4">
        <Button
          variant="outline"
          size="lg"
          className="rounded-xl min-w-[160px]"
          onClick={onToggleLogPanel}
        >
          {isLogPanelOpen ? t("app.hideLogs") : t("success.viewLogs")}
        </Button>
        <Button
          size="lg"
          onClick={onStartOver}
          className="bg-green-600 hover:bg-green-700 text-white shadow-xl shadow-green-600/20 rounded-xl min-w-[160px] hover:scale-105 transition-all"
        >
          {t("success.startOver")}
        </Button>
      </div>
    </div>
  );
}
