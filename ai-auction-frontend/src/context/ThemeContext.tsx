import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "dark" | "light" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "dark" | "light";
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem("app_theme") as Theme) || "dark";
  });

  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("dark");

  // Apply theme to <html> element
  useEffect(() => {
    const root = document.documentElement;
    let resolved: "dark" | "light" = "dark";

    if (theme === "system") {
      resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } else {
      resolved = theme;
    }

    setResolvedTheme(resolved);

    root.classList.remove("dark", "light");
    root.classList.add(resolved);

    // Apply CSS variables for smooth theming
    if (resolved === "light") {
      root.style.setProperty("--bg-primary", "#f8fafc");
      root.style.setProperty("--bg-secondary", "#f1f5f9");
      root.style.setProperty("--bg-card", "#ffffff");
      root.style.setProperty("--bg-card-hover", "#f8fafc");
      root.style.setProperty("--border-color", "#e2e8f0");
      root.style.setProperty("--text-primary", "#0f172a");
      root.style.setProperty("--text-secondary", "#475569");
      root.style.setProperty("--text-muted", "#94a3b8");
      root.style.setProperty("--sidebar-bg", "#ffffff");
      root.style.setProperty("--header-bg", "rgba(255,255,255,0.85)");
    } else {
      root.style.setProperty("--bg-primary", "#020617");
      root.style.setProperty("--bg-secondary", "#0f172a");
      root.style.setProperty("--bg-card", "#1e293b");
      root.style.setProperty("--bg-card-hover", "#253347");
      root.style.setProperty("--border-color", "#1e293b");
      root.style.setProperty("--text-primary", "#f8fafc");
      root.style.setProperty("--text-secondary", "#94a3b8");
      root.style.setProperty("--text-muted", "#475569");
      root.style.setProperty("--sidebar-bg", "#0f172a");
      root.style.setProperty("--header-bg", "rgba(15,23,42,0.85)");
    }
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setThemeState("system"); // trigger re‑run above
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = (t: Theme) => {
    localStorage.setItem("app_theme", t);
    setThemeState(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be inside <ThemeProvider>");
  return ctx;
}
