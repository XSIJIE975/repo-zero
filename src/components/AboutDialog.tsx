import { open } from "@tauri-apps/plugin-shell";
import { Github, Loader2, Check, AlertCircle, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui";
// Import package.json to get version
// Note: In Vite, we can import JSON files directly
import pkg from "../../package.json";
import logo from "@/assets/logo.png";
import { useUpdater } from "@/hooks/useUpdater";
import { ReactNode } from "react";

interface AboutDialogProps {
  children?: ReactNode;
}

export function AboutDialog({ children }: AboutDialogProps) {
  const { t } = useTranslation();
  const { status, updateInfo, checkForUpdate } = useUpdater();

  const handleOpenLink = async (url: string) => {
    try {
      await open(url);
    } catch (error) {
      console.error("Failed to open link:", error);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" className="w-full justify-start">
            {t("about.title")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("about.title")}</DialogTitle>
          <DialogDescription>
            {t("about.description", "A tool for cleaning up git repositories.")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 py-4">
          <div className="flex flex-col items-center gap-3">
            <div className="h-24 w-24 rounded-2xl overflow-hidden border border-border/50 shadow-sm">
              <img src={logo} alt="RepoZero Logo" className="h-full w-full object-cover" />
            </div>
            <div className="text-center space-y-0.5">
              <h3 className="text-xl font-bold tracking-tight">RepoZero</h3>
              <p className="text-sm text-muted-foreground">
                v{pkg.version}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto flex-col gap-1.5 py-3 hover:bg-secondary/50 hover:border-primary/50 transition-colors"
              onClick={() => handleOpenLink("https://github.com/XSIJIE975")}
            >
              <Github className="h-5 w-5" />
              <span className="text-xs font-medium">@XSIJIE975</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-auto flex-col gap-1.5 py-3 hover:bg-secondary/50 hover:border-primary/50 transition-colors"
              onClick={() => handleOpenLink("https://github.com/XSIJIE975/repo-zero")}
            >
              <Github className="h-5 w-5" />
              <span className="text-xs font-medium">{t("about.repository")}</span>
            </Button>
          </div>

          <div className="pt-2 border-t space-y-2">
             {/* Updater Section */}
             {status === "idle" && (
              <Button 
                variant="secondary" 
                className="w-full" 
                onClick={checkForUpdate}
              >
                {t("about.checkUpdate")}
              </Button>
             )}

             {status === "checking" && (
              <Button variant="secondary" className="w-full" disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("about.checking")}
              </Button>
             )}

             {status === "uptodate" && (
              <Button variant="ghost" className="w-full cursor-default hover:bg-transparent" disabled>
                <Check className="mr-2 h-4 w-4 text-green-500" />
                {t("about.upToDate")}
              </Button>
             )}

             {status === "error" && (
              <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10" onClick={checkForUpdate}>
                <AlertCircle className="mr-2 h-4 w-4" />
                {t("analysis.alertFailed", { error: "Check failed" })}
              </Button>
             )}

             {status === "available" && updateInfo && (
               <div className="rounded-md bg-secondary/50 p-3 text-sm">
                 <div className="flex items-center justify-between mb-2">
                   <span className="font-semibold text-primary flex items-center gap-2">
                     <Download className="h-4 w-4" />
                     {t("updater.newVersion")}: v{updateInfo.version}
                   </span>
                 </div>
                 {updateInfo.notes && (
                   <p className="text-muted-foreground text-xs mb-3 line-clamp-3">
                     {updateInfo.notes}
                   </p>
                 )}
                 <Button size="sm" className="w-full" onClick={() => handleOpenLink("https://github.com/XSIJIE975/repo-zero/releases/latest")}>
                   {t("updater.viewRelease")}
                 </Button>
               </div>
             )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
