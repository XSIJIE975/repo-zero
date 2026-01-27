import { HardDrive, GitBranch, Tag, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui";
import { RepoInfo } from "@/types/wizard";

interface AnalyzeStepProps {
  repoInfo: RepoInfo;
  onBack: () => void;
  onNext: () => void;
}

export function AnalyzeStep({ repoInfo, onBack, onNext }: AnalyzeStepProps) {
  const { t } = useTranslation();

  return (
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
        <Button variant="ghost" onClick={onBack} className="hover:bg-muted/50">
          {t("analysis.back")}
        </Button>
        <Button size="lg" onClick={onNext} className="bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all rounded-xl px-8">
          {t("analysis.next")}
          <ChevronDown className="ml-2 h-4 w-4 -rotate-90" />
        </Button>
      </div>
    </div>
  );
}
