import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useState } from "react";

type Theme = "dark" | "light" | "system";

interface ThemeSwitcherProps {
  variant?: "icon" | "dropdown";
  className?: string;
}

const OPTIONS: { value: Theme; icon: React.ReactNode; label: string }[] = [
  { value: "light",  icon: <Sun  className="w-4 h-4" />, label: "Light"  },
  { value: "dark",   icon: <Moon className="w-4 h-4" />, label: "Dark"   },
  { value: "system", icon: <Monitor className="w-4 h-4" />, label: "System" },
];

export default function ThemeSwitcher({ variant = "icon", className = "" }: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);

  const current = OPTIONS.find(o => o.value === theme) || OPTIONS[1];

  if (variant === "icon") {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          title={`Theme: ${current.label}`}
          className={`
            w-9 h-9 flex items-center justify-center rounded-xl
            border transition-all duration-200
            hover:border-indigo-500/50
            ${className}
          `}
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: showDropdown ? 'rgba(99,102,241,0.5)' : 'var(--border-color)',
            color: showDropdown ? '#818cf8' : 'var(--text-secondary)',
          }}
        >
          {current.icon}
        </button>

        {/* Floating popup */}
        {showDropdown && (
          <>
            {/* Backdrop to close */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowDropdown(false)}
            />
            <div
              className="absolute right-0 top-11 z-50 rounded-2xl border shadow-2xl overflow-hidden min-w-[160px] py-1.5"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-color)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
              }}
            >
              <p
                className="text-[10px] font-semibold uppercase tracking-wider px-3 py-1.5 pb-1"
                style={{ color: 'var(--text-muted)' }}
              >
                Appearance
              </p>
              {OPTIONS.map(opt => {
                const isActive = theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => { setTheme(opt.value); setShowDropdown(false); }}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-150 hover:bg-indigo-500/10"
                    style={{
                      color: isActive ? '#818cf8' : 'var(--text-primary)',
                      backgroundColor: isActive ? 'rgba(99,102,241,0.08)' : 'transparent',
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      {opt.icon}
                      <span>{opt.label}</span>
                    </div>
                    {isActive && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }

  // Pill/dropdown variant — three inline buttons
  return (
    <div
      className={`flex items-center gap-0.5 p-1 rounded-xl border ${className}`}
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-color)',
      }}
    >
      {OPTIONS.map(opt => {
        const isActive = theme === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            title={opt.label}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex-1 justify-center"
            style={{
              backgroundColor: isActive ? 'rgba(99,102,241,0.18)' : 'transparent',
              color: isActive ? '#818cf8' : 'var(--text-muted)',
              border: isActive ? '1px solid rgba(99,102,241,0.35)' : '1px solid transparent',
            }}
          >
            {opt.icon}
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
