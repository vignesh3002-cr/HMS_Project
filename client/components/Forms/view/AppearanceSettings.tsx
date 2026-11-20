import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type Theme } from "@/context/ThemeContext";

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: "light",
    label: "Light",
    icon: <Sun size={22} />,
    description: "Always use the light theme.",
  },
  {
    value: "dark",
    label: "Dark",
    icon: <Moon size={22} />,
    description: "Always use the dark theme.",
  },
  {
    value: "system",
    label: "System",
    icon: <Monitor size={22} />,
    description: "Follow your device's display setting.",
  },
];

export default function AppearanceSettings() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="hms-heading mb-1">Appearance</h2>
        <p className="hms-subheading">
          Choose how HMS looks to you. Select a theme or sync it with your device's
          display setting.
        </p>
      </div>

      {/* Theme selector */}
      <section className="rounded-xl border border-gray-200 dark:border-slate-800 dark:bg-slate-900/40 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100 mb-1">Theme</h3>
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-5">
          Controls the colour scheme of the entire application.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {THEME_OPTIONS.map((opt) => {
            const isActive = theme === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                className={[
                  "flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all text-left",
                  isActive
                    ? "border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 shadow-sm"
                    : "border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/60",
                ].join(" ")}
              >
                <div
                  className={[
                    "p-3 rounded-full",
                    isActive
                      ? "bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300"
                      : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300",
                  ].join(" ")}
                >
                  {opt.icon}
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{opt.label}</p>
                  <p
                    className={[
                      "text-xs mt-0.5",
                      isActive
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-400 dark:text-slate-400",
                    ].join(" ")}
                  >
                    {opt.description}
                  </p>
                </div>
                {/* Active indicator dot */}
                {isActive && (
                  <div className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 mt-auto" />
                )}
              </button>
            );
          })}
        </div>

        <div className="text-xs text-gray-400 dark:text-slate-500 mt-4 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Monitor size={12} />
            Theme preference is saved locally on this device only.
          </span>
          {theme === "system" && (
            <span className="font-medium text-blue-600 dark:text-blue-400">
              System active: {resolvedTheme === "dark" ? "Dark Mode" : "Light Mode"}
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
