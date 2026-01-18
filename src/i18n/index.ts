import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import en from "./locales/en.json"
import zhCN from "./locales/zh-CN.json"

import { awaitWrap } from "@/lib/utils"
import { getSetting, setSetting } from "@/lib/settings"

const LANGUAGE_KEY = "repo-zero:language"

type SupportedLanguage = "en" | "zh-CN"

function normalizeDetectedLanguage(raw: string | null | undefined): SupportedLanguage | null {
  if (!raw) return null

  // Handle "zh", "zh-CN", "zh-Hans", etc.
  if (raw.toLowerCase().startsWith("zh")) return "zh-CN"

  // Default to English for anything else
  return "en"
}

function detectLanguageFromEnvironment(): SupportedLanguage | null {
  if (typeof navigator === "undefined") return null

  const langs = Array.isArray(navigator.languages) ? navigator.languages : []
  for (const l of langs) {
    const normalized = normalizeDetectedLanguage(l)
    if (normalized) return normalized
  }

  return normalizeDetectedLanguage(navigator.language)
}

export async function initI18n() {
  const stored = await getSetting<SupportedLanguage>(LANGUAGE_KEY)
  const resolved = stored ?? detectLanguageFromEnvironment() ?? "en"

  await i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      "zh-CN": { translation: zhCN },
    },
    lng: resolved,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  })

  // First run: persist resolved language for future starts
  if (stored == null) {
    const [persistErr] = await awaitWrap(setSetting(LANGUAGE_KEY, resolved))
    if (persistErr) {
      // ignore
    }
  }
}

export async function setLanguage(lng: SupportedLanguage) {
  await i18n.changeLanguage(lng)

  const [persistErr] = await awaitWrap(setSetting(LANGUAGE_KEY, lng))
  if (persistErr) {
    // ignore
  }
}

export function getLanguage(): "en" | "zh-CN" {
  const lng = i18n.language
  return lng === "zh-CN" ? "zh-CN" : "en"
}
