import { useTranslation } from "react-i18next";
import { FolderOpen, Terminal, AlertTriangle, CheckCircle, HardDrive, GitBranch } from "lucide-react";
import { cn } from "@/components/ui";
import { Step } from "@/types/wizard";

interface SidebarProps {
  currentStep: Step;
}

export function Sidebar({ currentStep }: SidebarProps) {
  const { t } = useTranslation();

  return (
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
          const isActive = currentStep === s.id;
          const stepOrder = ["connect", "analyze", "confirm", "execute", "success"];
          const isPassed = stepOrder.indexOf(currentStep) > stepOrder.indexOf(s.id);
          
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
  );
}
