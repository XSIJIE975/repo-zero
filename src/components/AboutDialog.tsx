import { open } from "@tauri-apps/plugin-shell";
import { Github, ExternalLink, Loader2, Check, AlertCircle, Download } from "lucide-react";
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
        <div className="grid gap-4 py-4">
          <div className="flex flex-col items-center gap-4">
            <div className="h-20 w-20 rounded-xl bg-primary/10 flex items-center justify-center">
              {/* Logo placeholder - using text for now */}
              <span className="text-4xl font-bold text-primary">RZ</span>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">RepoZero</h3>
              <p className="text-sm text-muted-foreground">
                v{pkg.version}
              </p>
            </div>
          </div>

          <div className="grid gap-2">
            <Button
              variant="outline"
              className="justify-between"
              onClick={() => handleOpenLink("https://github.com/XSIJIE975")}
            >
              <span className="flex items-center gap-2">
                <Github className="h-4 w-4" />
                {t("about.author")} (XSIJIE975)
              </span>
              <ExternalLink className="h-3 w-3 opacity-50" />
            </Button>
            
            <Button
              variant="outline"
              className="justify-between"
              onClick={() => handleOpenLink("https://github.com/XSIJIE975/repo-zero")}
            >
              <span className="flex items-center gap-2">
                <Github className="h-4 w-4" />
                {t("about.repository")}
              </span>
              <ExternalLink className="h-3 w-3 opacity-50" />
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

            <p className="mt-2 text-xs text-center text-muted-foreground">
              {t("about.license", "MIT License")}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
