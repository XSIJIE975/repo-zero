import { useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { open } from "@tauri-apps/plugin-dialog"
import { addLog } from "@/lib/logStore"
import { useTranslation } from "react-i18next"
import { Step, RepoInfo } from "@/types/wizard"

export function useWizard() {
  const { t } = useTranslation()
  
  const [step, setStep] = useState<Step>("connect")
  const [repoPath, setRepoPath] = useState<string>("")
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null)
  const [confirmText, setConfirmText] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [targetBranch, setTargetBranch] = useState<string>("")
  const [isLogPanelOpen, setIsLogPanelOpen] = useState(false)

  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      })
      if (selected) {
        setRepoPath(selected)
        await analyzeRepo(selected)
      }
    } catch (e) {
      console.error("Dialog failed", e)
    }
  }

  const analyzeRepo = async (path: string) => {
    setIsProcessing(true)
    try {
      const info = await invoke<RepoInfo>("scan_repo", { path })
      setRepoInfo(info)
      // Pick a sensible default for the target branch.
      const inferred =
        info.detected_default_branch ??
        (info.default_branch_candidates.length === 1
          ? info.default_branch_candidates[0]
          : "")
      setTargetBranch(inferred)
      setStep("analyze")
    } catch (err) {
      console.error(err)
      alert(t("analysis.alertFailed", { error: String(err) }))
    } finally {
      setIsProcessing(false)
    }
  }

  const handleExecute = async () => {
    setIsProcessing(true)
    setStep("execute")
    setIsLogPanelOpen(true) // Automatically open logs on start
    addLog({ level: "info", category: "execute", message: "I18N:execute.startingCleanup" })
    addLog({ level: "info", category: "execute", message: "I18N:execute.pleaseWait" })

    const formatInvokeError = (err: unknown) => {
      const raw = String(err)
      const idx = raw.indexOf("I18N:")
      return idx >= 0 ? raw.slice(idx).trim() : raw
    }

    try {
      await invoke("execute_reset", { path: repoPath, targetBranch })
      setStep("success")
    } catch (err) {
      addLog({ level: "error", category: "execute", message: formatInvokeError(err) })
      // Stay on the execute screen so user can review logs.
      // The LogPanel is always available for deeper inspection.
    } finally {
      setIsProcessing(false)
    }
  }

  const handleStartOver = () => {
    // Avoid full reload so global app state (e.g. language) is preserved.
    setIsLogPanelOpen(false)
    setRepoPath("")
    setRepoInfo(null)
    setConfirmText("")
    setIsProcessing(false)
    setTargetBranch("")
    setStep("connect")
    addLog({
      level: "info",
      category: "execute",
      message: "I18N:success.startOver",
    })
  }

  return {
    step,
    setStep,
    repoPath,
    setRepoPath,
    repoInfo,
    setRepoInfo,
    confirmText,
    setConfirmText,
    isProcessing,
    setIsProcessing,
    targetBranch,
    setTargetBranch,
    isLogPanelOpen,
    setIsLogPanelOpen,
    handleSelectFolder,
    analyzeRepo,
    handleExecute,
    handleStartOver,
  }
}
