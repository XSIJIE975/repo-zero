import { useTranslation } from "react-i18next";
import { Languages, Moon, Sun, Monitor, Palette, Ban, Info } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  cn,
} from "@/components/ui";
import { AboutDialog } from "@/components/AboutDialog";
import { setLanguage } from "@/i18n";
import {
  getThemeSettings,
  setThemeAccentHsl,
  setThemeMode,
  ThemeMode,
} from "@/lib/theme";
import { useEffect, useState } from "react";

export function HeaderControls() {
  const { i18n, t } = useTranslation();
  const [themeMode, setMode] = useState<ThemeMode>("system");
  const [accent, setAccent] = useState<string | null>(null);

  useEffect(() => {
    const settings = getThemeSettings();
    setMode(settings.mode);
    setAccent(settings.accentHsl);
  }, []);

  const handleModeChange = (m: ThemeMode) => {
    setThemeMode(m);
    setMode(m);
  };

  const handleAccentChange = (hsl: string | null) => {
    setThemeAccentHsl(hsl);
    setAccent(hsl);
  };

  const accents = [
    { key: "header.theme.accent.default", hsl: null },
    { key: "header.theme.accent.indigo", hsl: "239 84% 67%" },
    { key: "header.theme.accent.red", hsl: "0 72.2% 50.6%" },
    { key: "header.theme.accent.orange", hsl: "24.6 95% 53.1%" },
    { key: "header.theme.accent.green", hsl: "142.1 76.2% 36.3%" },
    { key: "header.theme.accent.blue", hsl: "221.2 83.2% 53.3%" },
    { key: "header.theme.accent.yellow", hsl: "47.9 95.8% 53.1%" },
    { key: "header.theme.accent.violet", hsl: "262.1 83.3% 57.8%" },
    { key: "header.theme.accent.rose", hsl: "346.8 77.2% 49.8%" },
  ] as const;

  return (
    <div className="fixed top-6 right-6 z-50 flex items-center gap-1 rounded-full border bg-background/50 p-1 backdrop-blur-md shadow-sm transition-all hover:bg-background/80">
      {/* Language Switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
          >
            <Languages className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuCheckboxItem
            checked={i18n.language === "en"}
            onCheckedChange={() => setLanguage("en")}
            className="data-[state=checked]:bg-accent data-[state=checked]:text-foreground data-[state=checked]:font-medium"
          >
            {t("header.lang.english")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={i18n.language === "zh-CN"}
            onCheckedChange={() => setLanguage("zh-CN")}
            className="data-[state=checked]:bg-accent data-[state=checked]:text-foreground data-[state=checked]:font-medium"
          >
            {t("header.lang.chinese")}
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="h-4 w-[1px] bg-border/50" />

      {/* About Dialog */}
      <AboutDialog>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
        >
          <Info className="h-4 w-4" />
        </Button>
      </AboutDialog>

      <div className="h-4 w-[1px] bg-border/50" />

      {/* Theme Switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">{t("header.theme.toggle")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            {t("header.theme.mode")}
          </DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={themeMode === "light"}
            onCheckedChange={() => handleModeChange("light")}
            className="data-[state=checked]:bg-accent data-[state=checked]:text-foreground data-[state=checked]:font-medium"
          >
            <Sun className="mr-2 h-4 w-4" /> {t("header.theme.light")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={themeMode === "dark"}
            onCheckedChange={() => handleModeChange("dark")}
            className="data-[state=checked]:bg-accent data-[state=checked]:text-foreground data-[state=checked]:font-medium"
          >
            <Moon className="mr-2 h-4 w-4" /> {t("header.theme.dark")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={themeMode === "system"}
            onCheckedChange={() => handleModeChange("system")}
            className="data-[state=checked]:bg-accent data-[state=checked]:text-foreground data-[state=checked]:font-medium"
          >
            <Monitor className="mr-2 h-4 w-4" /> {t("header.theme.system")}
          </DropdownMenuCheckboxItem>

          <DropdownMenuSeparator />

          <DropdownMenuLabel className="flex items-center text-xs font-normal text-muted-foreground">
            <Palette className="mr-2 h-3.5 w-3.5" /> {t("header.theme.accentColor")}
          </DropdownMenuLabel>
          <div className="grid grid-cols-5 gap-2 p-2">
            {accents.map((c) => (
              <button
                key={c.key}
                className={cn(
                  "group relative flex h-8 w-8 items-center justify-center rounded-full border border-muted-foreground/20 transition-all hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  accent === c.hsl &&
                    "border-primary ring-2 ring-primary ring-offset-2",
                )}
                style={c.hsl ? { backgroundColor: `hsl(${c.hsl})` } : {}}
                onClick={() => handleAccentChange(c.hsl)}
                title={t(c.key)}
              >
                {c.hsl === null && (
                  <Ban className="h-4 w-4 text-muted-foreground/50" />
                )}
              </button>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
