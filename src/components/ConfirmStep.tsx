import { AlertTriangle, GitBranch, ChevronDown, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import {
  Button,
  Input,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui"
import { RepoInfo } from "@/types/wizard"

interface ConfirmStepProps {
  repoInfo: RepoInfo
  targetBranch: string
  confirmText: string
  onTargetBranchChange: (value: string) => void
  onConfirmTextChange: (value: string) => void
  onBack: () => void
  onExecute: () => void
}

export function ConfirmStep({
  repoInfo,
  targetBranch,
  confirmText,
  onTargetBranchChange,
  onConfirmTextChange,
  onBack,
  onExecute,
}: ConfirmStepProps) {
  const { t } = useTranslation()

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="rounded-3xl border border-destructive/15 bg-gradient-to-b from-destructive/10 via-card/90 to-card shadow-2xl shadow-destructive/10">
        <div className="p-5 sm:p-8">
          <div className="flex items-start gap-4 sm:gap-5 pb-5 border-b border-border/40">
            <div className="h-12 w-12 sm:h-14 sm:w-14 bg-destructive/10 rounded-2xl flex items-center justify-center ring-1 ring-destructive/20 shrink-0">
              <AlertTriangle className="h-6 w-6 sm:h-7 sm:w-7 text-destructive" />
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl sm:text-3xl font-bold text-destructive leading-tight">
                {t("danger.title")}
              </h2>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base leading-relaxed">
                {t("danger.willIntro")}
              </p>
            </div>
          </div>

          <div className="mt-5 sm:mt-6 grid gap-4 sm:gap-5">
            <div className="bg-muted/30 p-4 sm:p-6 rounded-2xl border border-border/50">
              <div className="grid gap-3">
                {[
                  t("danger.will.history"),
                  t("danger.will.branchesTags"),
                  t("danger.will.forcePush"),
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 text-sm sm:text-base text-foreground/80"
                  >
                    <div className="mt-1 h-5 w-5 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                      <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
                    </div>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {repoInfo && (
              <div className="grid gap-2">
                <label className="text-xs uppercase font-bold text-muted-foreground tracking-widest ml-1">
                  {t("danger.targetBranch.label")}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1 group">
                    <GitBranch className="absolute left-4 top-3 h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    <Input
                      value={targetBranch}
                      onChange={(e) => onTargetBranchChange(e.target.value)}
                      placeholder={t("danger.targetBranch.placeholder")}
                      className="pl-11 h-12 font-mono bg-background/50 border-input/50 focus:border-primary/50 transition-all rounded-xl"
                    />
                  </div>
                  {repoInfo.default_branch_candidates.length > 1 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-12 w-12 rounded-xl border-input/50"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {repoInfo.default_branch_candidates.map((c) => (
                          <DropdownMenuItem
                            key={c}
                            onClick={() => onTargetBranchChange(c)}
                            className="font-mono"
                          >
                            {c}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground ml-1 flex items-center gap-1.5">
                  <GitBranch className="h-3 w-3" />
                  {repoInfo.requires_default_branch_choice
                    ? t("danger.targetBranch.hint.required")
                    : t("danger.targetBranch.hint.detected")}
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-destructive/15 bg-destructive/5 p-4 sm:p-6">
              <div className="space-y-2 text-center">
                <label className="text-sm font-medium block">
                  {t("danger.confirmPrefix")}{" "}
                  <span className="text-destructive font-bold font-mono select-all bg-destructive/10 px-2 py-0.5 rounded">
                    "{t("danger.confirmPhrase")}"
                  </span>{" "}
                  {t("danger.confirmSuffix")}
                </label>
                <Input
                  value={confirmText}
                  onChange={(e) => onConfirmTextChange(e.target.value)}
                  placeholder={t("danger.confirmPhrase")}
                  className="border-destructive/30 focus-visible:ring-destructive/50 font-mono text-center text-lg sm:text-xl h-12 sm:h-14 tracking-wide bg-background/60 rounded-xl transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-1">
              <Button
                variant="outline"
                size="lg"
                className="flex-1 rounded-xl"
                onClick={onBack}
              >
                {t("danger.cancel")}
              </Button>
              <Button
                variant="destructive"
                size="lg"
                className="flex-1 shadow-xl shadow-destructive/20 rounded-xl hover:scale-[1.02] transition-all"
                disabled={
                  confirmText !== "nuclear reset" ||
                  targetBranch.trim().length === 0
                }
                onClick={onExecute}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t("danger.execute")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
