import {
  Search,
  User,
  Menu,
  X,
  Gavel,
  LogIn,
  LogOut,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";
import { NavLink, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useState, FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import ThemeSwitcher from "./ThemeSwitcher";
import toast from "react-hot-toast";

function Navbar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const { user, logout } = useAuth();

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/auctions?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsMobileMenuOpen(false);
    } else {
      navigate("/auctions");
    }
  };

  const handleLogout = () => {
    logout();
    toast.success("You've been signed out.");
    navigate("/");
    setIsMobileMenuOpen(false);
  };

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Auctions", path: "/auctions" },
    { name: "My Bids", path: "/my-bids" },
    { name: "Valuation Engine", path: "/add-vehicle" },
  ];

  return (
    <>
      {/* Inject navbar-specific keyframes */}
      <style>{`
        @keyframes navSlideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0);     }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .nav-animate-in {
          animation: navSlideDown 0.25s cubic-bezier(0.16,1,0.3,1) forwards;
        }
        .nav-link-pill {
          position: relative;
        }
        .nav-link-pill::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 50%;
          transform: translateX(-50%) scaleX(0);
          width: 60%;
          height: 2px;
          border-radius: 9999px;
          background: linear-gradient(90deg, #818cf8, #a78bfa);
          transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1);
        }
        .nav-link-pill.active::after,
        .nav-link-pill:hover::after {
          transform: translateX(-50%) scaleX(1);
        }
        .signin-btn {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #6366f1 100%);
          background-size: 200% auto;
          transition: background-position 0.4s ease, box-shadow 0.3s ease, transform 0.2s ease;
        }
        .signin-btn:hover {
          background-position: right center;
          box-shadow: 0 0 20px rgba(99,102,241,0.55), 0 4px 16px rgba(99,102,241,0.35);
          transform: translateY(-1px) scale(1.02);
        }
        .search-input:focus {
          box-shadow: 0 0 0 2px rgba(99,102,241,0.35), 0 0 20px rgba(99,102,241,0.12);
        }
        .hamburger-btn {
          transition: background 0.2s ease, transform 0.2s ease;
        }
        .hamburger-btn:hover {
          background: rgba(99,102,241,0.12);
          transform: scale(1.05);
        }
        .hamburger-btn:active {
          transform: scale(0.95);
        }
        .mobile-nav-link {
          position: relative;
          transition: all 0.2s ease;
        }
        .mobile-nav-link::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%) scaleY(0);
          width: 3px;
          height: 60%;
          border-radius: 0 4px 4px 0;
          background: linear-gradient(180deg, #6366f1, #a78bfa);
          transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1);
        }
        .mobile-nav-link.active::before,
        .mobile-nav-link:hover::before {
          transform: translateY(-50%) scaleY(1);
        }
      `}</style>

      <nav
        className="sticky top-0 z-50 border-b"
        style={{
          background:
            "linear-gradient(180deg, rgba(9,9,18,0.96) 0%, rgba(15,15,30,0.92) 100%)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderColor: "rgba(139,92,246,0.15)",
          boxShadow:
            "0 1px 0 rgba(139,92,246,0.12), 0 4px 32px rgba(0,0,0,0.4)",
        }}
      >
        {/* Subtle top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-[1px]"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.6) 30%, rgba(167,139,250,0.8) 50%, rgba(99,102,241,0.6) 70%, transparent 100%)",
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[68px] gap-4">

            {/* ── LOGO ── */}
            <div
              onClick={() => navigate("/")}
              className="flex items-center gap-3 cursor-pointer flex-shrink-0 group"
            >
              {/* Logo icon */}
              <div
                className="relative w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110"
                style={{
                  background:
                    "linear-gradient(135deg, #6366f1 0%, #8b5cf6 60%, #a855f7 100%)",
                  boxShadow:
                    "0 0 0 1px rgba(139,92,246,0.4), 0 4px 16px rgba(99,102,241,0.45)",
                }}
              >
                <Gavel className="text-white w-5 h-5 drop-shadow-sm" />
                {/* Shine overlay */}
                <div
                  className="absolute inset-0 rounded-xl opacity-60"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 60%)",
                  }}
                />
              </div>

              {/* Brand name */}
              <div className="flex flex-col leading-none">
                <span
                  className="font-extrabold text-[17px] tracking-tight"
                  style={{
                    background:
                      "linear-gradient(135deg, #e2e8f0 0%, #c4b5fd 50%, #a78bfa 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  AI Auction Portal
                </span>
                <span
                  className="text-[9px] font-semibold tracking-[0.18em] uppercase"
                  style={{ color: "rgba(139,92,246,0.7)" }}
                >
                  Asset Marketplace
                </span>
              </div>
            </div>

            {/* ── DESKTOP NAV LINKS ── */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  end={link.path === "/"}
                  className={({ isActive }) =>
                    `nav-link-pill relative px-4 py-2 rounded-lg text-[13px] font-semibold tracking-wide transition-all duration-200 ${
                      isActive
                        ? "active text-indigo-300"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span
                          className="absolute inset-0 rounded-lg"
                          style={{
                            background:
                              "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(167,139,250,0.08))",
                            border: "1px solid rgba(99,102,241,0.2)",
                          }}
                        />
                      )}
                      <span className="relative z-10">{link.name}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>

            {/* ── DESKTOP RIGHT SECTION ── */}
            <div className="hidden lg:flex items-center gap-3 flex-1 justify-end">

              {/* Search bar */}
              <form onSubmit={handleSearch} className="relative group">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200"
                  style={{ color: "rgba(148,163,184,0.7)" }}
                />
                <input
                  type="text"
                  placeholder="Search vehicles…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input w-64 xl:w-72 pl-9 pr-4 py-[9px] text-[13px] font-medium rounded-xl text-slate-200 placeholder-slate-500 outline-none transition-all duration-200"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                  onFocus={(e) => {
                    (e.target as HTMLInputElement).style.borderColor =
                      "rgba(99,102,241,0.5)";
                    (e.target as HTMLInputElement).style.background =
                      "rgba(99,102,241,0.06)";
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLInputElement).style.borderColor =
                      "rgba(255,255,255,0.08)";
                    (e.target as HTMLInputElement).style.background =
                      "rgba(255,255,255,0.04)";
                  }}
                />
              </form>

              {/* Theme switcher */}
              <ThemeSwitcher variant="icon" />

              {/* AI Assistant Quick Trigger */}
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("open-ai-assistant"))}
                title="Open Role-Based AI Assistant"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-300 hover:text-white transition-all duration-200 border border-indigo-500/30 hover:border-indigo-400/60 bg-indigo-500/10 hover:bg-indigo-500/20 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span className="hidden xl:inline">AI Assistant</span>
              </button>

              {/* Auth section */}
              {user ? (
                <div className="flex items-center gap-2">
                  <NavLink
                    to="/dashboard"
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
                        isActive
                          ? "text-white"
                          : "text-slate-300 hover:text-white"
                      }`
                    }
                    style={({ isActive }) => ({
                      background: isActive
                        ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                        : "rgba(255,255,255,0.05)",
                      border: isActive
                        ? "1px solid rgba(99,102,241,0.4)"
                        : "1px solid rgba(255,255,255,0.08)",
                      boxShadow: isActive
                        ? "0 4px 16px rgba(99,102,241,0.35)"
                        : "none",
                    })}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span className="max-w-[80px] truncate">
                      {user.name.split(" ")[0]}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                      user.role === 'admin' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                      user.role === 'bank' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      user.role === 'seller' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' :
                      'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    }`}>
                      {user.role || 'buyer'}
                    </span>
                  </NavLink>

                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 hover:scale-105"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "rgba(148,163,184,0.8)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "rgba(239,68,68,0.1)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        "rgba(239,68,68,0.35)";
                      (e.currentTarget as HTMLButtonElement).style.color =
                        "#f87171";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "rgba(255,255,255,0.04)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        "rgba(255,255,255,0.08)";
                      (e.currentTarget as HTMLButtonElement).style.color =
                        "rgba(148,163,184,0.8)";
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="signin-btn flex items-center gap-2 px-5 py-2 rounded-xl text-white text-[13px] font-bold tracking-wide"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Link>
              )}
            </div>

            {/* ── MOBILE MENU TOGGLE ── */}
            <div className="lg:hidden flex items-center gap-2">
              {/* Theme switcher visible on mobile too */}
              <ThemeSwitcher variant="icon" />

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle menu"
                className="hamburger-btn w-9 h-9 flex items-center justify-center rounded-xl"
                style={{
                  background: isMobileMenuOpen
                    ? "rgba(99,102,241,0.15)"
                    : "rgba(255,255,255,0.04)",
                  border: `1px solid ${
                    isMobileMenuOpen
                      ? "rgba(99,102,241,0.3)"
                      : "rgba(255,255,255,0.08)"
                  }`,
                  color: isMobileMenuOpen ? "#818cf8" : "rgba(148,163,184,0.8)",
                }}
              >
                <div className="relative w-5 h-5">
                  <span
                    className="absolute inset-0 flex items-center justify-center transition-all duration-200"
                    style={{
                      opacity: isMobileMenuOpen ? 0 : 1,
                      transform: isMobileMenuOpen
                        ? "rotate(90deg) scale(0.5)"
                        : "rotate(0deg) scale(1)",
                    }}
                  >
                    <Menu className="w-5 h-5" />
                  </span>
                  <span
                    className="absolute inset-0 flex items-center justify-center transition-all duration-200"
                    style={{
                      opacity: isMobileMenuOpen ? 1 : 0,
                      transform: isMobileMenuOpen
                        ? "rotate(0deg) scale(1)"
                        : "rotate(-90deg) scale(0.5)",
                    }}
                  >
                    <X className="w-5 h-5" />
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* ── MOBILE MENU ── */}
        {isMobileMenuOpen && (
          <div
            className="lg:hidden nav-animate-in border-t"
            style={{
              borderColor: "rgba(139,92,246,0.15)",
              background:
                "linear-gradient(180deg, rgba(9,9,18,0.98) 0%, rgba(15,12,28,0.98) 100%)",
            }}
          >
            <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-2">

              {/* Mobile search */}
              <form onSubmit={handleSearch} className="relative mb-2">
                <Search
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "rgba(148,163,184,0.6)" }}
                />
                <input
                  type="text"
                  placeholder="Search vehicles…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-sm font-medium rounded-xl text-slate-200 placeholder-slate-500 outline-none"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                />
              </form>

              {/* Mobile nav links */}
              {navLinks.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  end={link.path === "/"}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `mobile-nav-link px-4 py-3 rounded-xl text-[13px] font-semibold tracking-wide transition-all duration-200 ${
                      isActive
                        ? "active text-indigo-300"
                        : "text-slate-400 hover:text-slate-200"
                    }`
                  }
                  style={({ isActive }) => ({
                    background: isActive
                      ? "rgba(99,102,241,0.1)"
                      : "rgba(255,255,255,0.02)",
                    border: `1px solid ${
                      isActive
                        ? "rgba(99,102,241,0.2)"
                        : "rgba(255,255,255,0.05)"
                    }`,
                  })}
                >
                  {link.name}
                </NavLink>
              ))}

              {/* Mobile AI Assistant Trigger */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  window.dispatchEvent(new CustomEvent("open-ai-assistant"));
                }}
                className="flex items-center justify-between px-4 py-3 rounded-xl text-[13px] font-semibold tracking-wide text-indigo-300 bg-indigo-500/10 border border-indigo-500/20"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span>Role-Based AI Assistant</span>
                </span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                  {user?.role || "Active"}
                </span>
              </button>

              {/* Mobile divider */}
              <div
                className="my-1 h-px"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(139,92,246,0.3), transparent)",
                }}
              />

              {/* Mobile auth section */}
              {user ? (
                <>
                  <NavLink
                    to="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `mobile-nav-link flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
                        isActive
                          ? "active text-indigo-300"
                          : "text-slate-400 hover:text-slate-200"
                      }`
                    }
                    style={({ isActive }) => ({
                      background: isActive
                        ? "rgba(99,102,241,0.1)"
                        : "rgba(255,255,255,0.02)",
                      border: `1px solid ${
                        isActive
                          ? "rgba(99,102,241,0.2)"
                          : "rgba(255,255,255,0.05)"
                      }`,
                    })}
                  >
                    <User className="w-4 h-4" />
                    {user.name}
                  </NavLink>

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-semibold text-left transition-all duration-200"
                    style={{
                      background: "rgba(239,68,68,0.07)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      color: "#f87171",
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="signin-btn flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white text-[13px] font-bold tracking-wide"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}

export default Navbar;
