import { open } from "@tauri-apps/plugin-shell";
import { useTranslation } from "react-i18next";
import { UpdateInfo } from "@/hooks/useUpdater";
import { getVersion } from "@tauri-apps/api/app";
import { useState, useEffect } from "react";
import { X, ExternalLink } from "lucide-react";

interface UpdateToastProps {
  updateInfo: UpdateInfo;
  onClose: () => void;
}

export function UpdateToast({ updateInfo, onClose }: UpdateToastProps) {
  const { t } = useTranslation();
  const [currentVersion, setCurrentVersion] = useState<string>("...");

  useEffect(() => {
    getVersion().then(setCurrentVersion);
  }, []);

  const handleOpenRelease = async () => {
    // 通常 release URL 是固定的，或者从 updateInfo 获取
    // 这里假设 updateInfo 没有 URL，我们构建一个通用的 GitHub Release URL
    // 或者如果有 updateInfo.body 里包含链接也可以
    // 简单起见，这里打开 GitHub Releases 页面，实际项目可以从 tauri.conf.json 读取 repo url
    // 但为了通用，我们假设用户会去 Releases 页面
    // 更好的做法是让后端返回 url，或者这里硬编码 repo url
    // 暂时用 generic 链接，实际项目应替换
    await open("https://github.com/Starttoaster/repo-zero/releases/latest");
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-popover text-popover-foreground border border-border shadow-lg rounded-lg p-4 animate-in slide-in-from-right-full duration-300">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          🎉 {t("updater.newVersion", "New version found!")}
        </h3>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      
      <div className="text-sm text-muted-foreground mb-4 space-y-1">
        <p>
          {t("updater.version", "Version")}: <span className="font-mono">{currentVersion}</span> → <span className="font-mono text-primary">{updateInfo.version}</span>
        </p>
        {updateInfo.date && (
          <p className="text-xs opacity-80">{updateInfo.date}</p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={handleOpenRelease}
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors"
        >
          {t("updater.viewRelease", "View Release")}
          <ExternalLink className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
