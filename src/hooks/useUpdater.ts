import { useState, useCallback } from "react";
import { check } from "@tauri-apps/plugin-updater";

export type UpdateStatus = "idle" | "checking" | "available" | "error" | "uptodate";

export interface UpdateInfo {
  version: string;
  date?: string;
  notes?: string;
}

export function useUpdater() {
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  const checkForUpdate = useCallback(async () => {
    // 仅在生产模式运行
    if (!import.meta.env.PROD) {
      console.log("Update check skipped (not in PROD)");
      return;
    }

    setStatus("checking");
    try {
      const update = await check();
      
      if (update?.available) {
        setUpdateInfo({
          version: update.version,
          date: update.date,
          notes: update.body,
        });
        setStatus("available");
      } else {
        setStatus("uptodate");
      }
    } catch (error) {
      console.error("Failed to check for updates:", error);
      setStatus("error");
    }
  }, []);

  return {
    status,
    updateInfo,
    checkForUpdate,
  };
}
