import { useTranslation } from "react-i18next"
import { Download, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui"

interface GitNotInstalledPageProps {
  onRetry: () => void
  isChecking: boolean
}

export function GitNotInstalledPage({ onRetry, isChecking }: GitNotInstalledPageProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
      {/* Icon */}
      <div className="h-24 w-24 rounded-3xl bg-destructive/10 flex items-center justify-center mb-6">
        <Download className="h-12 w-12 text-destructive" />
      </div>

      {/* Title */}
      <h1 className="text-4xl font-bold tracking-tight mb-3">
        {t("git.notInstalled.title")}
      </h1>

      {/* Description */}
      <p className="text-lg text-muted-foreground max-w-md mb-8">
        {t("git.notInstalled.desc")}
      </p>

      {/* Download Link */}
      <a
        href="https://git-scm.com/downloads"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors mb-4"
      >
        <Download className="h-5 w-5" />
        {t("git.notInstalled.downloadLink")}
      </a>

      {/* Retry Button */}
      <Button
        variant="outline"
        onClick={onRetry}
        disabled={isChecking}
        className="min-w-[200px]"
      >
        {isChecking ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            {t("git.checking")}
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("git.notInstalled.retry")}
          </>
        )}
      </Button>
    </div>
  )
}
