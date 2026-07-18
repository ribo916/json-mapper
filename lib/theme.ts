export type ThemeId = "daylight" | "paper" | "midnight" | "ocean" | "nord";
export type ThemeChoice = ThemeId | "system";

export interface ThemeDef {
  id: ThemeId;
  name: string;
  group: "light" | "dark";
  /** Preview swatch colors (hex) for the picker. */
  swatch: { bg: string; surface: string; accent: string };
}

export const THEMES: ThemeDef[] = [
  { id: "daylight", name: "Daylight", group: "light", swatch: { bg: "#f8fafc", surface: "#ffffff", accent: "#0369a1" } },
  { id: "paper", name: "Paper", group: "light", swatch: { bg: "#f5f0e8", surface: "#fffbf5", accent: "#9a3412" } },
  { id: "midnight", name: "Midnight", group: "dark", swatch: { bg: "#020617", surface: "#0f172a", accent: "#38bdf8" } },
  { id: "ocean", name: "Ocean", group: "dark", swatch: { bg: "#080f1e", surface: "#0f1b30", accent: "#2dd4bf" } },
  { id: "nord", name: "Nord", group: "dark", swatch: { bg: "#2e3440", surface: "#3b4252", accent: "#88c0d0" } },
];

export const DARK_THEMES: ThemeId[] = ["midnight", "ocean", "nord"];
export const STORAGE_KEY = "pricer-theme";

export function isDarkTheme(id: ThemeId): boolean {
  return DARK_THEMES.includes(id);
}

export function resolveChoice(choice: ThemeChoice, prefersDark: boolean): ThemeId {
  if (choice === "system") return prefersDark ? "midnight" : "daylight";
  return choice;
}

export function applyTheme(id: ThemeId): void {
  const root = document.documentElement;
  root.dataset.theme = id;
  root.classList.toggle("dark", isDarkTheme(id));
}
