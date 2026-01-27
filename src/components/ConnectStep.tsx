import { useTranslation } from "react-i18next";
import { FolderOpen, Loader2 } from "lucide-react";
import { cn } from "@/components/ui";

interface ConnectStepProps {
  isProcessing: boolean;
  onSelectFolder: () => void;
}

export function ConnectStep({ isProcessing, onSelectFolder }: ConnectStepProps) {
  const { t } = useTranslation();

  return (
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
        onClick={isProcessing ? undefined : onSelectFolder}
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
  );
}
