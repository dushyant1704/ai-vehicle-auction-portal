import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import {
  LayoutDashboard, Gavel, BookMarked, Trophy, Heart,
  Brain, Bell, Settings, LogOut, ChevronLeft, ChevronRight,
  User, Search, TrendingUp, Car, IndianRupee, Activity,
  Clock, ArrowUpRight, ArrowDownRight, Flame, Star,
  BarChart2, Zap, Menu, RefreshCw, X, CheckCheck,
  ChevronUp, ChevronDown, SlidersHorizontal, Filter,
  FileCheck, Loader2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import ThemeSwitcher from "../components/ThemeSwitcher";
import toast from "react-hot-toast";

/* ─────────────── Types ─────────────── */
interface Stats {
  totalBids: number;
  totalSpend: number;
  uniqueVehicles: number;
  totalAuctions: number;
  wonAuctions: number;
  activeBids: number;
  savedVehicles: number;
  aiAlerts: number;
}

interface BidEntry {
  _id: string;
  vehicleId: string;
  brand: string;
  model: string;
  year?: number | string;
  fuel?: string;
  amount: number;
  time: string;
  image?: string | null;
  status?: "leading" | "outbid" | "won" | "active";
}

interface ActivityEntry {
  id: string;
  type: "bid_placed" | "outbid" | "watchlist" | "won" | string;
  message: string;
  time: string;
  vehicleId?: string;
}

interface Vehicle {
  _id: string;
  brand: string;
  model: string;
  year?: number;
  fuel?: string;
  mileage?: number;
  images?: string[];
  marketPrice?: number;
}

type SortOption = "newest" | "oldest" | "highest" | "lowest";

const API = "http://localhost:5000/api";

const NAV_ITEMS = [
  { label: "Dashboard",         icon: LayoutDashboard, path: "/dashboard",        section: "overview" },
  { label: "Live Car Auctions", icon: Gavel,           path: "/auctions",         section: "auctions" },
  { label: "My Bids",           icon: BookMarked,      path: "/dashboard#mybids", section: "mybids"   },
  { label: "Won Vehicles",      icon: Trophy,          path: "/dashboard#won",    section: "won"      },
  { label: "Saved Auctions",    icon: Heart,           path: "/dashboard#saved",  section: "saved"    },
  { label: "AI Valuation",      icon: Brain,           path: "/add-vehicle",      section: "ai"       },
  { label: "Notifications",     icon: Bell,            path: "/dashboard#alerts", section: "alerts"   },
] as const;

/* ─────────────── Helpers ─────────────── */
const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function relTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ─────────────── rAF-based counter hook ─────────────── */
function useCountUp(target: number, duration = 900, enabled = true): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!enabled || target <= 0) { setCount(target); return; }
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
      else setCount(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, enabled]);
  return count;
}

/* ─────────────── Skeleton (uses dash-skeleton CSS class) ─────────────── */
function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`dash-skeleton ${className}`} />;
}

/* ─────────────── Animated Number ─────────────── */
function AnimatedNumber({ value, enabled }: { value: number; enabled: boolean }) {
  const count = useCountUp(value, 900, enabled);
  return <span>{count.toLocaleString("en-IN")}</span>;
}

/* ─────────────── Main Dashboard ─────────────── */
function Dashboard() {
  const { user, token, logout } = useAuth();
  useTheme(); // subscribe for theme-driven CSS variables
  const navigate   = useNavigate();
  const location   = useLocation();

  /* State */
  const [sidebarOpen,       setSidebarOpen]       = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeSection,     setActiveSection]      = useState("overview");
  const [stats,             setStats]              = useState<Stats | null>(null);
  const [bids,              setBids]               = useState<BidEntry[]>([]);
  const [activities,        setActivities]         = useState<ActivityEntry[]>([]);
  const [recommendations,   setRecommendations]    = useState<Vehicle[]>([]);
  const [vehicles,          setVehicles]           = useState<Vehicle[]>([]);
  const [loading,           setLoading]            = useState(true);
  const [refreshing,        setRefreshing]         = useState(false);
  const [searchQuery,       setSearchQuery]        = useState("");
  const [notifCount,        setNotifCount]         = useState(0);
  const [notifPanelOpen,    setNotifPanelOpen]     = useState(false);
  const [notifRead,         setNotifRead]          = useState(false);
  const [sortOption,        setSortOption]         = useState<SortOption>("newest");
  const [sortDropOpen,      setSortDropOpen]       = useState(false);
  const [countersReady,     setCountersReady]      = useState(false);

  /* Scroll refs */
  const myBidsRef = useRef<HTMLDivElement>(null);
  const wonRef    = useRef<HTMLDivElement>(null);
  const savedRef  = useRef<HTMLDivElement>(null);

  /* Guard */
  useEffect(() => { if (!user) navigate("/login"); }, [user, navigate]);

  const headers = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token]
  );

  /* ── Core data fetch ── */
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else         setRefreshing(true);

    try {
      const [statsRes, bidsRes, actRes, recRes, vehiclesRes] = await Promise.allSettled([
        axios.get(`${API}/user/stats`,           { headers }),
        axios.get(`${API}/user/bids`,            { headers }),
        axios.get(`${API}/user/activity`,        { headers }),
        axios.get(`${API}/user/recommendations`, { headers }),
        axios.get(`${API}/vehicles?limit=6`),
      ]);

      /* Stats */
      if (statsRes.status === "fulfilled") setStats(statsRes.value.data);

      /* Bids — with localStorage fallback */
      let fetchedBids: BidEntry[] = [];
      if (bidsRes.status === "fulfilled") {
        fetchedBids = bidsRes.value.data.bids ?? [];
      } else {
        fetchedBids = JSON.parse(localStorage.getItem("bids") ?? "[]");
      }
      setBids(fetchedBids);

      /* Activities → notification count (today's fresh only, no hardcode) */
      if (actRes.status === "fulfilled") {
        const acts: ActivityEntry[] = actRes.value.data.activities ?? [];
        setActivities(acts);
        const fresh = acts.filter(
          a => Date.now() - new Date(a.time).getTime() < 86_400_000
        );
        setNotifCount(Math.min(fresh.length, 9));
      } else {
        /* Proxy: count today's bids as notification indicator */
        const todayBids = fetchedBids.filter(
          b => Date.now() - new Date(b.time).getTime() < 86_400_000
        );
        setNotifCount(Math.min(todayBids.length, 9));
      }

      /* Recommendations */
      if (recRes.status === "fulfilled")
        setRecommendations(recRes.value.data.recommendations ?? []);

      /* Live vehicles */
      if (vehiclesRes.status === "fulfilled")
        setVehicles(vehiclesRes.value.data.vehicles?.slice(0, 6) ?? []);

    } catch {
      /* silent — show whatever we have */
    } finally {
      setLoading(false);
      setRefreshing(false);
      setTimeout(() => setCountersReady(true), 300);
    }
  }, [headers]);

  /* Initial load */
  useEffect(() => { loadData(); }, [loadData]);

  /* Background polling every 30 s */
  useEffect(() => {
    const id = setInterval(() => loadData(true), 30_000);
    return () => clearInterval(id);
  }, [loadData]);

  /* Hash-based section scroll & notification panel */
  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (!hash) return;
    setActiveSection(hash);
    const refMap: Record<string, React.RefObject<HTMLDivElement>> = {
      mybids: myBidsRef,
      won:    wonRef,
      saved:  savedRef,
    };
    setTimeout(() => {
      refMap[hash]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (hash === "alerts") setNotifPanelOpen(true);
    }, 150);
  }, [location.hash]);

  /* Close sort dropdown on outside click */
  useEffect(() => {
    if (!sortDropOpen) return;
    const close = () => setSortDropOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [sortDropOpen]);

  /* ── Handlers ── */
  const handleLogout = useCallback(() => {
    logout();
    toast.success("Signed out successfully.");
    navigate("/");
  }, [logout, navigate]);

  const handleMarkAllRead = useCallback(() => {
    setNotifCount(0);
    setNotifRead(true);
    toast.success("All notifications marked as read.");
  }, []);

  const handleManualRefresh = useCallback(async () => {
    setNotifRead(false); // allow badge to reappear if new ones come
    await loadData(false);
    toast.success("Dashboard refreshed!");
  }, [loadData]);

  /* ── Admin Pending Documents ── */
  const [pendingDocs, setPendingDocs] = useState<any[]>([]);
  const [pendingDocsLoading, setPendingDocsLoading] = useState(false);

  const loadPendingDocs = useCallback(async () => {
    if (user?.role !== "admin" || !token) return;
    try {
      setPendingDocsLoading(true);
      const res = await axios.get("http://localhost:5000/api/documents/pending", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingDocs(res.data.documents || []);
    } catch (e) {
      console.error("Error loading pending documents:", e);
    } finally {
      setPendingDocsLoading(false);
    }
  }, [user?.role, token]);

  useEffect(() => {
    loadPendingDocs();
  }, [loadPendingDocs]);

  const handleAdminReviewDoc = async (docId: string, status: "VERIFIED" | "REJECTED", reason?: string) => {
    if (!token) return;
    try {
      await axios.put(`http://localhost:5000/api/documents/${docId}/review`, {
        status,
        rejectionReason: reason || undefined,
        verificationNotes: "Reviewed from Admin Dashboard queue"
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Document marked as ${status}`);
      loadPendingDocs();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update document");
    }
  };

  /* ── Computed values (memoised) ── */
  const memberSince = useMemo(() =>
    user?.createdAt
      ? new Date(user.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
      : "Recently",
  [user?.createdAt]);

  const searchLower = useMemo(() => searchQuery.toLowerCase().trim(), [searchQuery]);

  const filteredBids = useMemo(() =>
    searchLower
      ? bids.filter(b =>
          b.brand.toLowerCase().includes(searchLower) ||
          b.model.toLowerCase().includes(searchLower))
      : bids,
  [bids, searchLower]);

  const filteredVehicles = useMemo(() =>
    searchLower
      ? vehicles.filter(v =>
          v.brand.toLowerCase().includes(searchLower) ||
          v.model.toLowerCase().includes(searchLower))
      : vehicles,
  [vehicles, searchLower]);

  const sortedBids = useMemo(() =>
    [...filteredBids].sort((a, b) => {
      switch (sortOption) {
        case "newest":  return new Date(b.time).getTime() - new Date(a.time).getTime();
        case "oldest":  return new Date(a.time).getTime() - new Date(b.time).getTime();
        case "highest": return Number(b.amount)  - Number(a.amount);
        case "lowest":  return Number(a.amount)  - Number(b.amount);
        default:        return 0;
      }
    }),
  [filteredBids, sortOption]);

  const wonBids = useMemo(() => bids.filter(b => b.status === "won"), [bids]);

  const totalSpend = useMemo(
    () => stats?.totalSpend ?? bids.reduce((s, b) => s + Number(b.amount), 0),
    [stats, bids]
  );

  const winRate = useMemo(
    () => stats?.wonAuctions && stats?.totalBids
      ? Math.round((stats.wonAuctions / stats.totalBids) * 100)
      : 0,
    [stats]
  );

  /* Chart data — real bids grouped by month, last 6 months */
  const { bidChartData, bidChartLabels } = useMemo(() => {
    const now  = new Date();
    const data: number[] = [];
    const labs: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const t = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labs.push(t.toLocaleString("en-IN", { month: "short" }));
      data.push(bids.filter(b => {
        const d = new Date(b.time);
        return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth();
      }).length);
    }
    return { bidChartData: data, bidChartLabels: labs };
  }, [bids]);

  /* Spending by month (in ₹ lakhs) — for sparkline */
  const spendByMonth = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const t = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return bids
        .filter(b => {
          const d = new Date(b.time);
          return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth();
        })
        .reduce((sum, b) => sum + Number(b.amount), 0) / 100_000;
    });
  }, [bids]);

  if (!user) return null;

  const showBidCards     = sortedBids.length > 0;
  const showVehicleCards = !showBidCards && filteredVehicles.length > 0;

  /* ─────────── Sidebar (internal sub-component) ─────────── */
  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside
      className={`flex flex-col border-r transition-all duration-300 ease-in-out z-40
        ${mobile ? "fixed inset-y-0 left-0 w-72 shadow-2xl" : sidebarOpen ? "w-64" : "w-20"}`}
      style={{ backgroundColor: "var(--sidebar-bg)", borderColor: "var(--border-color)" }}
    >
      {/* Logo */}
      <div
        className={`flex items-center gap-3 px-5 py-5 border-b ${!sidebarOpen && !mobile ? "justify-center" : ""}`}
        style={{ borderColor: "var(--border-color)" }}
      >
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
          <Gavel className="w-5 h-5 text-white" />
        </div>
        {(sidebarOpen || mobile) && (
          <div>
            <span className="text-white font-extrabold text-lg tracking-tight">AI Auction</span>
            <p className="text-[10px] text-indigo-400 font-medium leading-none mt-0.5">Repossessed Assets</p>
          </div>
        )}
      </div>

      {/* Phase badge */}
      {(sidebarOpen || mobile) && (
        <div className="mx-4 mt-4 mb-2 px-3 py-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
            <Car className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div>
            <p className="text-[10px] text-indigo-300 font-semibold uppercase tracking-wider">Current Phase</p>
            <p className="text-xs text-white font-semibold">Car / Vehicle Auctions</p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item, idx) => {
          const Icon     = item.icon;
          const isActive = activeSection === item.section;
          return (
            <button
              key={item.label}
              onClick={() => {
                if (item.section === "alerts") {
                  setActiveSection("alerts");
                  setNotifPanelOpen(true);
                  if (mobile) setMobileSidebarOpen(false);
                  return;
                }
                if (item.path.startsWith("/dashboard")) {
                  setActiveSection(item.section);
                  navigate(item.path);
                } else {
                  navigate(item.path);
                }
                if (mobile) setMobileSidebarOpen(false);
              }}
              style={{ animationDelay: `${idx * 40}ms` }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200 dash-nav-item
                ${isActive
                  ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/70"}
                ${!sidebarOpen && !mobile ? "justify-center" : ""}`}
              title={!sidebarOpen && !mobile ? item.label : ""}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-indigo-400" : ""}`} />
              {(sidebarOpen || mobile) && <span className="flex-1 text-left">{item.label}</span>}
              {(sidebarOpen || mobile) && item.label === "Notifications" && notifCount > 0 && !notifRead && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                  {notifCount > 9 ? "9+" : notifCount}
                </span>
              )}
              {(sidebarOpen || mobile) && isActive && item.label !== "Notifications" && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="p-3 border-t space-y-1.5" style={{ borderColor: "var(--border-color)" }}>
        {(sidebarOpen || mobile) && (
          <div className="px-1 pb-1">
            <ThemeSwitcher variant="dropdown" />
          </div>
        )}
        <button
          onClick={() => { navigate("/profile"); if (mobile) setMobileSidebarOpen(false); }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
            transition-all ${!sidebarOpen && !mobile ? "justify-center" : ""}`}
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = "var(--bg-card)"; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}
          title={!sidebarOpen && !mobile ? "Profile Settings" : ""}
        >
          <Settings className="w-4 h-4 shrink-0" />
          {(sidebarOpen || mobile) && <span>Profile Settings</span>}
        </button>
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
            text-red-400 hover:bg-red-500/10 transition-all
            ${!sidebarOpen && !mobile ? "justify-center" : ""}`}
          title={!sidebarOpen && !mobile ? "Logout" : ""}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {(sidebarOpen || mobile) && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );

  /* ─────────────────────────────────────────────────────── */
  return (
    <div className="flex h-screen overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: "var(--bg-primary)" }}>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex"><Sidebar /></div>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm dash-mobile-overlay"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="dash-slide-in-left"><Sidebar mobile /></div>
        </div>
      )}

      {/* Notifications Panel */}
      {notifPanelOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setNotifPanelOpen(false)} />
          <div
            className="absolute right-0 top-0 h-full w-full max-w-sm dash-slide-in-right flex flex-col shadow-2xl"
            style={{ backgroundColor: "var(--sidebar-bg)", borderLeft: "1px solid var(--border-color)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0"
              style={{ borderColor: "var(--border-color)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">Notifications</h3>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {notifCount > 0 && !notifRead ? `${notifCount} unread` : "All caught up"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {notifCount > 0 && !notifRead && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 text-xs font-semibold hover:bg-indigo-500/25 transition-all"
                  >
                    <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                  </button>
                )}
                <button
                  onClick={() => setNotifPanelOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {(() => {
                const items = activities.length > 0 ? activities : bids.map(b => ({
                  id: b._id,
                  type: "bid_placed" as const,
                  message: `Bid placed on ${b.brand} ${b.model} — ₹${Number(b.amount).toLocaleString()}`,
                  time: b.time,
                  vehicleId: b.vehicleId,
                }));
                if (items.length === 0) return (
                  <div className="flex flex-col items-center justify-center h-48 text-center px-6">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                      style={{ backgroundColor: "var(--bg-card)" }}>
                      <Bell className="w-7 h-7" style={{ color: "var(--text-muted)" }} />
                    </div>
                    <p className="text-white font-semibold text-sm mb-1">All clear!</p>
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>No notifications yet.</p>
                  </div>
                );
                const iconMap: Record<string, { icn: React.ReactNode; cls: string }> = {
                  bid_placed: { icn: <Gavel className="w-4 h-4" />,         cls: "bg-indigo-500/15 text-indigo-400"  },
                  outbid:     { icn: <ArrowDownRight className="w-4 h-4"/>, cls: "bg-red-500/15 text-red-400"         },
                  watchlist:  { icn: <Heart className="w-4 h-4" />,         cls: "bg-pink-500/15 text-pink-400"       },
                  won:        { icn: <Trophy className="w-4 h-4" />,        cls: "bg-yellow-500/15 text-yellow-400"   },
                };
                return (
                  <ul>
                    {items.slice(0, 15).map((a, i) => {
                      const stl   = iconMap[a.type] ?? iconMap.bid_placed;
                      const unread = i < notifCount && !notifRead;
                      return (
                        <li
                          key={a.id}
                          className={`flex items-start gap-3 px-5 py-3.5 cursor-pointer relative
                            hover:bg-slate-800/40 transition-colors ${unread ? "notif-unread" : ""}`}
                          onClick={() => {
                            if (a.vehicleId) { setNotifPanelOpen(false); navigate(`/vehicle/${a.vehicleId}`); }
                          }}
                        >
                          {unread && <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${stl.cls}`}>
                            {stl.icn}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium leading-snug" style={{ color: "var(--text-primary)" }}>{a.message}</p>
                            <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{relTime(a.time)}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t shrink-0" style={{ borderColor: "var(--border-color)" }}>
              <Link
                to="/auctions"
                onClick={() => setNotifPanelOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 text-sm font-semibold hover:bg-indigo-500/25 transition-all"
              >
                Browse Live Auctions <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top navbar */}
        <header
          className="backdrop-blur-xl border-b px-4 lg:px-6 py-3.5 flex items-center gap-3 shrink-0 z-30"
          style={{ backgroundColor: "var(--header-bg)", borderColor: "var(--border-color)" }}
        >
          <button
            onClick={() => setMobileSidebarOpen(true)}
            title="Open menu"
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            onClick={() => setSidebarOpen(p => !p)}
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            className="hidden lg:flex w-8 h-8 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all"
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {/* Search */}
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search vehicles, bids..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && searchQuery.trim())
                  navigate(`/auctions?q=${encodeURIComponent(searchQuery)}`);
                if (e.key === "Escape") setSearchQuery("");
              }}
              className="w-full pl-10 pr-10 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/60 text-sm transition-all"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor:     "var(--border-color)",
                color:           "var(--text-primary)",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Live-update indicator */}
            {refreshing && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                Updating
              </div>
            )}

            {/* Refresh */}
            <button
              onClick={handleManualRefresh}
              title="Refresh dashboard"
              disabled={loading}
              className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all hover:border-indigo-500/40 ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
              style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            <ThemeSwitcher variant="icon" />

            {/* Bell */}
            <button
              onClick={() => { setNotifPanelOpen(true); setActiveSection("alerts"); }}
              title="Notifications"
              className="relative w-9 h-9 flex items-center justify-center rounded-xl border text-slate-400 hover:text-white transition-all hover:border-indigo-500/40"
              style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}
            >
              <Bell className="w-4 h-4" />
              {notifCount > 0 && !notifRead && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-lg shadow-red-500/40 animate-bounce">
                  {notifCount > 9 ? "9+" : notifCount}
                </span>
              )}
            </button>

            {/* Profile chip */}
            <Link
              to="/profile"
              title="View profile"
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border hover:border-indigo-500/40 transition-all"
              style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-indigo-500/30">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <p className="text-white text-xs font-semibold leading-none">{user.name?.split(" ")[0]}</p>
                <p className="text-xs leading-none mt-0.5 capitalize" style={{ color: "var(--text-muted)" }}>{user.role || "buyer"}</p>
              </div>
            </Link>
          </div>
        </header>

        {/* Scrollable main */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6"
          style={{ backgroundColor: "var(--bg-primary)" }}>

          {/* ── Profile Hero ── */}
          <div className="relative overflow-hidden rounded-3xl border backdrop-blur-sm p-6 lg:p-8 dash-profile-hero"
            style={{ borderColor: "var(--border-color)" }}>
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl -mb-20 pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center gap-6">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-2xl p-0.5 bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/30 dash-avatar-ring">
                  <div className="w-full h-full rounded-[14px] flex items-center justify-center text-3xl font-extrabold text-white"
                    style={{ backgroundColor: "var(--bg-card)" }}>
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div
                  className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 shadow-lg shadow-emerald-500/40 animate-pulse"
                  style={{ borderColor: "var(--bg-primary)" }}
                  title="Online"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start gap-4 justify-between">
                  <div>
                    <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                      <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">{user.name}</h1>
                      <span className="px-2.5 py-0.5 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-indigo-300 text-xs font-semibold capitalize">
                        {user.role || "Buyer"}
                      </span>
                    </div>
                    <p className="text-sm flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                      <User className="w-3.5 h-3.5" /> {user.email}
                    </p>
                    <p className="text-xs mt-1 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                      <Clock className="w-3.5 h-3.5" /> Member since {memberSince}
                    </p>
                  </div>
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white text-sm font-semibold backdrop-blur-sm transition-all hover:-translate-y-0.5"
                  >
                    <Settings className="w-4 h-4" /> Edit Profile
                  </Link>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                  {[
                    { label: "Total Bids",    value: stats?.totalBids    ?? bids.length, icon: Gavel,      color: "text-indigo-400",  bg: "bg-indigo-500/10"  },
                    { label: "Won Auctions",  value: stats?.wonAuctions  ?? 0,           icon: Trophy,     color: "text-yellow-400",  bg: "bg-yellow-500/10"  },
                    { label: "Active Bids",   value: stats?.activeBids   ?? bids.length, icon: Activity,   color: "text-emerald-400", bg: "bg-emerald-500/10" },
                    { label: "Total Spend",   value: null,                               icon: IndianRupee,color: "text-purple-400",  bg: "bg-purple-500/10", formatted: fmt(totalSpend) },
                  ].map(s => {
                    const Icon = s.icon;
                    return (
                      <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3 hover:bg-white/10 transition-all">
                        <div className={`w-8 h-8 rounded-xl ${s.bg} flex items-center justify-center ${s.color} shrink-0`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-white font-bold text-base leading-none">
                            {s.formatted ?? <AnimatedNumber value={s.value as number} enabled={countersReady} />}
                          </p>
                          <p className="text-slate-400 text-[11px] mt-0.5">{s.label}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ── Stats Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)
            ) : (
              [
                { label: "Live Auctions",  value: stats?.totalAuctions  ?? vehicles.length, icon: Flame,       grad: "from-orange-500/20 to-red-500/20",    border: "border-orange-500/20", text: "text-orange-400",  trend: null        },
                { label: "My Active Bids", value: stats?.activeBids     ?? bids.length,     icon: Gavel,       grad: "from-indigo-500/20 to-blue-500/20",   border: "border-indigo-500/20", text: "text-indigo-400",  trend: null        },
                { label: "Won Cars",       value: stats?.wonAuctions    ?? 0,               icon: Trophy,      grad: "from-yellow-500/20 to-amber-500/20",  border: "border-yellow-500/20", text: "text-yellow-400",  trend: null        },
                { label: "Total Spend",    value: totalSpend,                               icon: IndianRupee, grad: "from-purple-500/20 to-pink-500/20",   border: "border-purple-500/20", text: "text-purple-400",  isRupee: true      },
                { label: "Saved Vehicles", value: stats?.savedVehicles  ?? 0,               icon: Heart,       grad: "from-pink-500/20 to-rose-500/20",     border: "border-pink-500/20",   text: "text-pink-400",    trend: null        },
                { label: "AI Alerts",      value: stats?.aiAlerts       ?? notifCount,      icon: Brain,       grad: "from-emerald-500/20 to-teal-500/20",  border: "border-emerald-500/20",text: "text-emerald-400", trend: notifCount > 0 ? "New" : null },
              ].map((card, idx) => {
                const Icon = card.icon;
                const isRupee = "isRupee" in card && card.isRupee;
                return (
                  <div
                    key={card.label}
                    className={`relative bg-gradient-to-br ${card.grad} border ${card.border} rounded-2xl p-4 hover:scale-[1.03] hover:shadow-lg transition-all duration-300 cursor-default dash-stat-card`}
                    style={{ animationDelay: `${idx * 70}ms` }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2 rounded-xl bg-slate-800/60 ${card.text}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {card.trend && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-emerald-400 bg-emerald-500/10 flex items-center gap-0.5">
                          <ChevronUp className="w-2.5 h-2.5" /> {card.trend}
                        </span>
                      )}
                    </div>
                    <p className={`font-extrabold text-white leading-none ${isRupee ? "text-base" : "text-xl"}`}>
                      {isRupee ? fmt(card.value) : <AnimatedNumber value={card.value} enabled={countersReady} />}
                    </p>
                    <p className="text-xs mt-1.5 leading-tight" style={{ color: "var(--text-secondary)" }}>{card.label}</p>
                  </div>
                );
              })
            )}
          </div>

          {/* ── Admin Compliance & Document Queue (Admin Only) ── */}
          {user?.role === "admin" && (
            <div className="rounded-3xl border p-6 bg-slate-900/60 backdrop-blur-sm space-y-4" style={{ borderColor: "var(--border-color)" }}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-lg flex items-center gap-2">
                      Admin Document Verification Queue
                      {pendingDocs.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {pendingDocs.length} Pending Review
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-slate-400">RC books, bank repossession notices, and Form 35 NOC approval stream.</p>
                  </div>
                </div>
                <button
                  onClick={loadPendingDocs}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                >
                  Refresh Queue
                </button>
              </div>

              {pendingDocsLoading ? (
                <div className="py-8 flex items-center justify-center text-slate-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> Fetching pending documents...
                </div>
              ) : pendingDocs.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs bg-slate-800/30 rounded-2xl border border-slate-800">
                  <p className="font-semibold text-slate-300">All compliance documents are up to date.</p>
                  <p className="mt-1 text-slate-500">New uploads from sellers and banks will appear here automatically for review.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {pendingDocs.map((doc: any) => (
                    <div key={doc._id} className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-start justify-between">
                          <p className="text-xs font-bold text-white uppercase">{doc.documentType?.replace(/_/g, " ")}</p>
                          <div className="flex items-center gap-1.5">
                            {doc.trustScore !== undefined && doc.trustScore > 0 && (
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                  doc.trustScore >= 80
                                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                    : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                }`}
                              >
                                {doc.trustScore}% Match
                              </span>
                            )}
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              PENDING
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-300 mt-1">
                          Vehicle: <span className="font-semibold">{doc.vehicleId?.brand} {doc.vehicleId?.model}</span> ({doc.vehicleId?.year || "Year N/A"})
                        </p>
                        {(doc.extractedFields?.registrationNumber || doc.extractedData?.registrationNumber || doc.documentReference) && (
                          <p className="text-[11px] font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded mt-1.5 inline-block">
                            Ref: {doc.extractedFields?.registrationNumber || doc.extractedData?.registrationNumber || doc.documentReference}
                          </p>
                        )}
                        {doc.autoRecommendation && (
                          <p className="text-[10px] text-slate-400 mt-1">
                            Engine Verdict:{" "}
                            <span
                              className={`font-semibold ${
                                doc.autoRecommendation === "RECOMMENDED_APPROVE"
                                  ? "text-emerald-400"
                                  : doc.autoRecommendation === "FLAGGED_RISK"
                                  ? "text-rose-400"
                                  : "text-amber-400"
                              }`}
                            >
                              {doc.autoRecommendation?.replace(/_/g, " ")}
                            </span>
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-700/60">
                        {doc.fileUrl ? (
                          <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">
                            Inspect File <ArrowUpRight className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="text-xs text-slate-500">File attached</span>
                        )}
                        <div className="flex items-center gap-1.5 ml-auto">
                          <button
                            onClick={() => handleAdminReviewDoc(doc._id, "VERIFIED")}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              const reason = window.prompt("Enter rejection reason for this document:");
                              if (reason) handleAdminReviewDoc(doc._id, "REJECTED", reason);
                            }}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Seller & Institutional Bank Asset Actions ── */}
          {(user?.role === "seller" || user?.role === "bank") && (
            <div className="rounded-3xl border p-6 bg-gradient-to-r from-indigo-950/40 to-slate-900/60 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderColor: "var(--border-color)" }}>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                  {user.role === "bank" ? "Institutional Asset Manager" : "Certified Asset Seller"}
                </span>
                <h3 className="text-lg font-bold text-white">Manage Repossessed Vehicle Inventory</h3>
                <p className="text-xs text-slate-400">List new repossessed inventory with automated AI valuation and document compliance checks.</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link
                  to="/add-vehicle"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
                >
                  <Car className="w-4 h-4" /> Add Vehicle
                </Link>
                <Link
                  to="/auctions"
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all border border-slate-700"
                >
                  View Market
                </Link>
              </div>
            </div>
          )}

          {/* ── My Bids / Live Auctions + Activity ── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

            {/* Left: Bids / Vehicles */}
            <div className="xl:col-span-2 space-y-4" id="mybids" ref={myBidsRef}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full" />
                  <h2 className="text-white font-bold text-lg">
                    {bids.length > 0 ? "My Active Bids" : "Live Car Auctions"}
                  </h2>
                  {(bids.length > 0 || vehicles.length > 0) && (
                    <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-300 text-xs font-semibold">
                      {bids.length > 0 ? bids.length : vehicles.length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {bids.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={e => { e.stopPropagation(); setSortDropOpen(p => !p); }}
                        title="Sort bids"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all hover:border-indigo-500/40"
                        style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline capitalize">{sortOption}</span>
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      {sortDropOpen && (
                        <div
                          className="absolute right-0 top-[calc(100%+4px)] z-30 w-44 rounded-xl border shadow-2xl overflow-hidden py-1"
                          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}
                          onClick={e => e.stopPropagation()}
                        >
                          {(["newest","oldest","highest","lowest"] as SortOption[]).map(o => (
                            <button
                              key={o}
                              onClick={() => { setSortOption(o); setSortDropOpen(false); }}
                              className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-medium hover:bg-indigo-500/10 transition-all"
                              style={{ color: sortOption === o ? "#818cf8" : "var(--text-primary)" }}
                            >
                              <span>{{newest:"Newest first",oldest:"Oldest first",highest:"Highest bid",lowest:"Lowest bid"}[o]}</span>
                              {sortOption === o && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <Link to="/auctions" className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-sm font-semibold transition-colors">
                    View All <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Search filter hint */}
              {searchQuery && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
                  <Filter className="w-3.5 h-3.5 shrink-0" />
                  Filtering by <span className="font-bold">"{searchQuery}"</span> — {showBidCards ? sortedBids.length : filteredVehicles.length} result(s)
                  <button onClick={() => setSearchQuery("")} className="ml-auto hover:text-white transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="rounded-2xl overflow-hidden border" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
                      <Skeleton className="h-36 rounded-none" />
                      <div className="p-4 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-5 w-1/3 mt-3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : showBidCards ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {sortedBids.slice(0, 4).map((bid, i) => <BidCard key={bid._id} bid={bid} idx={i} />)}
                </div>
              ) : showVehicleCards ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredVehicles.map((v, i) => <VehicleCard key={v._id} vehicle={v} idx={i} />)}
                </div>
              ) : (
                <EmptyState
                  icon={<Car className="w-12 h-12" style={{ color: "var(--text-muted)" }} />}
                  title={searchQuery ? "No matches found" : "No Live Auctions"}
                  desc={searchQuery ? `No vehicles match "${searchQuery}"` : "Check back soon for new car auctions"}
                  cta={searchQuery ? "Clear Search" : "Browse Auctions"}
                  href={searchQuery ? "" : "/auctions"}
                  onCta={searchQuery ? () => setSearchQuery("") : undefined}
                />
              )}
            </div>

            {/* Right: Recent Activity */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-1 h-6 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full" />
                <h2 className="text-white font-bold text-lg">Recent Activity</h2>
              </div>
              <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
                {loading ? (
                  <div className="p-4 space-y-3">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="flex gap-3 items-start">
                        <Skeleton className="w-7 h-7 rounded-xl shrink-0" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-3 w-3/4" />
                          <Skeleton className="h-2 w-1/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : activities.length > 0 ? (
                  <ul className="divide-y" style={{ borderColor: "var(--border-color)" }}>
                    {activities.slice(0, 8).map(a => <ActivityItem key={a.id} activity={a} onNavigate={navigate} />)}
                  </ul>
                ) : bids.length > 0 ? (
                  <ul className="divide-y" style={{ borderColor: "var(--border-color)" }}>
                    {bids.slice(0, 6).map(b => (
                      <li
                        key={b._id}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-slate-700/20 transition-colors cursor-pointer"
                        onClick={() => navigate(`/vehicle/${b.vehicleId}`)}
                      >
                        <div className="w-7 h-7 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Gavel className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium leading-snug truncate" style={{ color: "var(--text-primary)" }}>
                            Bid on {b.brand} {b.model}
                          </p>
                          <p className="text-emerald-400 text-xs font-bold">₹{Number(b.amount).toLocaleString()}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{relTime(b.time)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-8 text-center">
                    <Activity className="w-10 h-10 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
                    <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>No activity yet</p>
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Start bidding to see your history</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── AI Recommendations ── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full" />
                <h2 className="text-white font-bold text-lg">AI Recommended For You</h2>
                <span className="px-2.5 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-300 text-[10px] font-semibold flex items-center gap-1.5">
                  <Zap className="w-2.5 h-2.5" /> AI Powered
                </span>
              </div>
              <Link to="/auctions" className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-sm font-semibold transition-colors">
                See All <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-2xl overflow-hidden border" style={{ borderColor: "var(--border-color)" }}>
                    <Skeleton className="h-28 rounded-none" />
                    <div className="p-3 space-y-1.5">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-2 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (recommendations.length > 0 ? recommendations : vehicles).length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                {(recommendations.length > 0 ? recommendations : vehicles).map((v, i) => (
                  <RecommendationCard key={v._id} vehicle={v} idx={i} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Brain className="w-12 h-12" style={{ color: "var(--text-muted)" }} />}
                title="No recommendations yet"
                desc="Browse and bid to get personalised AI recommendations."
                cta="Explore Auctions"
                href="/auctions"
              />
            )}
          </div>

          {/* ── Won Vehicles ── */}
          <div className="space-y-4" id="won" ref={wonRef}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-1 h-6 bg-gradient-to-b from-yellow-500 to-amber-500 rounded-full" />
                <h2 className="text-white font-bold text-lg">Won Vehicles</h2>
                <span className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-yellow-300 text-xs font-semibold">
                  {stats?.wonAuctions ?? wonBids.length}
                </span>
              </div>
              <Link to="/auctions" className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-sm font-semibold transition-colors">
                Browse More <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[1,2].map(i => (
                  <div key={i} className="rounded-2xl overflow-hidden border" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
                    <Skeleton className="h-32 rounded-none" />
                    <div className="p-4 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
                  </div>
                ))}
              </div>
            ) : wonBids.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {wonBids.map((bid, i) => <WonCard key={bid._id} bid={bid} idx={i} />)}
              </div>
            ) : (
              <EmptyState
                icon={<Trophy className="w-12 h-12" style={{ color: "var(--text-muted)" }} />}
                title="No wins yet"
                desc="Place competitive bids to win your first vehicle!"
                cta="Bid on Auctions"
                href="/auctions"
              />
            )}
          </div>

          {/* ── Saved Vehicles ── */}
          <div className="space-y-4" id="saved" ref={savedRef}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-1 h-6 bg-gradient-to-b from-pink-500 to-rose-500 rounded-full" />
                <h2 className="text-white font-bold text-lg">Saved Auctions</h2>
                <span className="px-2 py-0.5 bg-pink-500/10 border border-pink-500/20 rounded-full text-pink-300 text-xs font-semibold">
                  {stats?.savedVehicles ?? 0}
                </span>
              </div>
              <Link to="/auctions" className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-sm font-semibold transition-colors">
                Browse Vehicles <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[1].map(i => (
                  <div key={i} className="rounded-2xl overflow-hidden border" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
                    <Skeleton className="h-32 rounded-none" /><div className="p-4 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
                  </div>
                ))}
              </div>
            ) : (stats?.savedVehicles ?? 0) > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {vehicles.slice(0, stats?.savedVehicles).map((v, i) => <SavedCard key={v._id} vehicle={v} idx={i} />)}
              </div>
            ) : (
              <EmptyState
                icon={<Heart className="w-12 h-12" style={{ color: "var(--text-muted)" }} />}
                title="No saved auctions"
                desc="Save vehicles you're watching to track them here."
                cta="Explore Vehicles"
                href="/auctions"
              />
            )}
          </div>

          {/* ── Analytics ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AnalyticsCard title="Bidding Activity" subtitle="Last 6 months" icon={<BarChart2 className="w-4 h-4" />} color="indigo">
              <AnimatedBarChart data={bidChartData} labels={bidChartLabels} enabled={!loading} />
            </AnalyticsCard>
            <AnalyticsCard title="Win Rate" subtitle="Overall performance" icon={<Trophy className="w-4 h-4" />} color="yellow">
              <ArcGauge rate={winRate} enabled={!loading} />
            </AnalyticsCard>
            <AnalyticsCard title="Spending Trend" subtitle="This month" icon={<TrendingUp className="w-4 h-4" />} color="purple">
              <SpendingSparkLine spend={totalSpend} monthlySpend={spendByMonth} enabled={!loading} />
            </AnalyticsCard>
          </div>

          <div className="h-6" />
        </main>
      </div>
    </div>
  );
}

/* ─────────────── Sub-components ─────────────── */

function BidCard({ bid, idx }: { bid: BidEntry; idx: number }) {
  const STATUS = {
    leading: { label: "Leading",  cls: "bg-emerald-500 text-white"    },
    outbid:  { label: "Outbid",   cls: "bg-red-500 text-white"        },
    won:     { label: "Won! 🏆",  cls: "bg-yellow-400 text-slate-900" },
    active:  { label: "Active",   cls: "bg-indigo-500 text-white"     },
  };
  const s = bid.status ? STATUS[bid.status] : STATUS.active;
  return (
    <Link
      to={`/vehicle/${bid.vehicleId}`}
      className="group rounded-2xl overflow-hidden border hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 hover:-translate-y-1 dash-fade-in-up block"
      style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)", animationDelay: `${idx * 80}ms` }}
    >
      <div className="h-36 relative overflow-hidden" style={{ backgroundColor: "var(--bg-secondary)" }}>
        {bid.image
          ? <img src={bid.image} alt={`${bid.brand} ${bid.model}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          : <div className="w-full h-full flex items-center justify-center"><Car className="w-14 h-14" style={{ color: "var(--text-muted)" }} /></div>
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className={`absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-lg ${s.cls}`}>{s.label}</div>
      </div>
      <div className="p-4">
        <h3 className="text-white font-bold text-sm leading-tight">{bid.brand} <span className="text-slate-300">{bid.model}</span></h3>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{bid.year || ""} {bid.fuel || ""}</p>
        <div className="flex items-center justify-between mt-3">
          <div>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Your bid</p>
            <p className="text-emerald-400 font-extrabold text-base leading-none">₹{Number(bid.amount).toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Placed</p>
            <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{relTime(bid.time)}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

function VehicleCard({ vehicle, idx }: { vehicle: Vehicle; idx: number }) {
  return (
    <Link
      to={`/vehicle/${vehicle._id}`}
      className="group rounded-2xl overflow-hidden border hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 hover:-translate-y-1 dash-fade-in-up block"
      style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)", animationDelay: `${idx * 80}ms` }}
    >
      <div className="h-36 relative overflow-hidden" style={{ backgroundColor: "var(--bg-secondary)" }}>
        {vehicle.images?.[0]
          ? <img src={vehicle.images[0]} alt={`${vehicle.brand} ${vehicle.model}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          : <div className="w-full h-full flex items-center justify-center"><Car className="w-14 h-14" style={{ color: "var(--text-muted)" }} /></div>
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute top-2.5 right-2.5 px-2.5 py-0.5 bg-emerald-500 rounded-full text-white text-[10px] font-bold">Live</div>
      </div>
      <div className="p-4">
        <h3 className="text-white font-bold text-sm">{vehicle.brand} <span className="text-slate-300">{vehicle.model}</span></h3>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{vehicle.year} · {vehicle.fuel}</p>
        <div className="flex items-center justify-between mt-3">
          <div>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>AI Price Est.</p>
            <p className="text-indigo-400 font-extrabold text-base leading-none">
              {vehicle.marketPrice ? fmt(vehicle.marketPrice) : "Calculating..."}
            </p>
          </div>
          <span className="px-2.5 py-1.5 bg-indigo-500/15 border border-indigo-500/25 rounded-xl text-indigo-300 text-xs font-semibold hover:bg-indigo-500/25 transition-all">
            Bid Now
          </span>
        </div>
      </div>
    </Link>
  );
}

function RecommendationCard({ vehicle, idx }: { vehicle: Vehicle; idx: number }) {
  return (
    <Link
      to={`/vehicle/${vehicle._id}`}
      className="group rounded-2xl overflow-hidden border hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-200 hover:-translate-y-1 dash-fade-in-up block"
      style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)", animationDelay: `${idx * 60}ms` }}
    >
      <div className="h-28 relative overflow-hidden" style={{ backgroundColor: "var(--bg-secondary)" }}>
        {vehicle.images?.[0]
          ? <img src={vehicle.images[0]} alt={`${vehicle.brand} ${vehicle.model}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          : <div className="w-full h-full flex items-center justify-center"><Car className="w-10 h-10" style={{ color: "var(--text-muted)" }} /></div>
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute top-1.5 right-1.5">
          <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 drop-shadow-lg" />
        </div>
      </div>
      <div className="p-3">
        <p className="text-white font-semibold text-xs leading-tight truncate">{vehicle.brand} {vehicle.model}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{vehicle.year}</p>
        {vehicle.marketPrice && <p className="text-indigo-400 text-xs font-bold mt-1">{fmt(vehicle.marketPrice)}</p>}
      </div>
    </Link>
  );
}

function WonCard({ bid, idx }: { bid: BidEntry; idx: number }) {
  return (
    <Link
      to={`/vehicle/${bid.vehicleId}`}
      className="group rounded-2xl overflow-hidden border border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-amber-500/5 hover:border-yellow-500/40 hover:shadow-xl hover:shadow-yellow-500/10 transition-all duration-300 hover:-translate-y-1 dash-fade-in-up block"
      style={{ animationDelay: `${idx * 80}ms` }}
    >
      <div className="h-32 relative overflow-hidden" style={{ backgroundColor: "var(--bg-secondary)" }}>
        {bid.image
          ? <img src={bid.image} alt={`${bid.brand} ${bid.model}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          : <div className="w-full h-full flex items-center justify-center"><Car className="w-12 h-12" style={{ color: "var(--text-muted)" }} /></div>
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute top-2.5 right-2.5 px-2.5 py-0.5 bg-yellow-400 rounded-full text-slate-900 text-[10px] font-bold flex items-center gap-1">
          <Trophy className="w-3 h-3" /> Won
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-white font-bold text-sm">{bid.brand} <span className="text-slate-300">{bid.model}</span></h3>
        <p className="text-yellow-400 text-xs font-semibold mt-0.5">Final: ₹{Number(bid.amount).toLocaleString()}</p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{relTime(bid.time)}</p>
      </div>
    </Link>
  );
}

function SavedCard({ vehicle, idx }: { vehicle: Vehicle; idx: number }) {
  return (
    <Link
      to={`/vehicle/${vehicle._id}`}
      className="group rounded-2xl overflow-hidden border border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-rose-500/5 hover:border-pink-500/40 hover:shadow-xl hover:shadow-pink-500/10 transition-all duration-300 hover:-translate-y-1 dash-fade-in-up block"
      style={{ animationDelay: `${idx * 80}ms` }}
    >
      <div className="h-32 relative overflow-hidden" style={{ backgroundColor: "var(--bg-secondary)" }}>
        {vehicle.images?.[0]
          ? <img src={vehicle.images[0]} alt={`${vehicle.brand} ${vehicle.model}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          : <div className="w-full h-full flex items-center justify-center"><Car className="w-12 h-12" style={{ color: "var(--text-muted)" }} /></div>
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute top-2.5 right-2.5">
          <Heart className="w-4 h-4 text-pink-400 fill-pink-400 drop-shadow-lg" />
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-white font-bold text-sm">{vehicle.brand} <span className="text-slate-300">{vehicle.model}</span></h3>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{vehicle.year} · {vehicle.fuel}</p>
        {vehicle.marketPrice && <p className="text-pink-400 font-bold text-sm mt-2">AI Est. {fmt(vehicle.marketPrice)}</p>}
      </div>
    </Link>
  );
}

function ActivityItem({
  activity,
  onNavigate,
}: {
  activity: ActivityEntry;
  onNavigate: (path: string) => void;
}) {
  const ICONS: Record<string, { icn: React.ReactNode; cls: string }> = {
    bid_placed: { icn: <Gavel className="w-3.5 h-3.5" />,         cls: "bg-indigo-500/15 text-indigo-400"  },
    outbid:     { icn: <ArrowDownRight className="w-3.5 h-3.5" />,cls: "bg-red-500/15 text-red-400"         },
    watchlist:  { icn: <Heart className="w-3.5 h-3.5" />,         cls: "bg-pink-500/15 text-pink-400"       },
    won:        { icn: <Trophy className="w-3.5 h-3.5" />,        cls: "bg-yellow-500/15 text-yellow-400"   },
  };
  const s = ICONS[activity.type] ?? ICONS.bid_placed;
  return (
    <li
      className="flex items-start gap-3 px-4 py-3 hover:bg-slate-700/20 transition-colors cursor-pointer"
      onClick={() => { if (activity.vehicleId) onNavigate(`/vehicle/${activity.vehicleId}`); }}
    >
      <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${s.cls}`}>{s.icn}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium leading-snug" style={{ color: "var(--text-primary)" }}>{activity.message}</p>
        <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{relTime(activity.time)}</p>
      </div>
    </li>
  );
}

function EmptyState({
  icon, title, desc, cta, href, onCta,
}: {
  icon: React.ReactNode; title: string; desc: string; cta: string; href: string; onCta?: () => void;
}) {
  return (
    <div className="rounded-2xl p-12 text-center border" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}>
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "var(--bg-secondary)" }}>{icon}</div>
      <h3 className="text-white font-bold text-base mb-2">{title}</h3>
      <p className="text-sm mb-6 max-w-xs mx-auto" style={{ color: "var(--text-secondary)" }}>{desc}</p>
      {onCta ? (
        <button onClick={onCta} className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all text-sm hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/30">
          {cta}
        </button>
      ) : (
        <Link to={href} className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all text-sm hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/30">
          {cta} <ArrowUpRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}

function AnalyticsCard({
  title, subtitle, icon, color, children,
}: { title: string; subtitle: string; icon: React.ReactNode; color: string; children: React.ReactNode }) {
  const C: Record<string, string> = {
    indigo: "from-indigo-500/10 to-blue-500/5 border-indigo-500/20 text-indigo-400",
    yellow: "from-yellow-500/10 to-amber-500/5 border-yellow-500/20 text-yellow-400",
    purple: "from-purple-500/10 to-pink-500/5 border-purple-500/20 text-purple-400",
  };
  const c = C[color] ?? C.indigo;
  const [, , borderCls, textCls] = c.split(" ");
  return (
    <div className={`bg-gradient-to-br ${c.split(" ").slice(0,2).join(" ")} border ${borderCls} rounded-2xl p-5`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-white font-semibold text-sm">{title}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{subtitle}</p>
        </div>
        <div className={`p-2 rounded-xl bg-slate-800/60 ${textCls}`}>{icon}</div>
      </div>
      {children}
    </div>
  );
}

/* ─── Animated bar chart (fully dynamic labels) ─── */
function AnimatedBarChart({ data, labels, enabled }: { data: number[]; labels: string[]; enabled: boolean }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(t);
  }, [enabled]);

  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1.5 h-20">
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full flex items-end" style={{ height: 60 }}>
            <div
              className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 hover:from-indigo-500 hover:to-blue-400 rounded-t-md transition-all duration-700 cursor-pointer"
              style={{
                height: ready ? `${Math.max((v / max) * 100, v > 0 ? 8 : 2)}%` : "2%",
                transitionDelay: `${i * 80}ms`,
                minHeight: 2,
              }}
              title={`${labels[i]}: ${v} bids`}
            />
          </div>
          <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── SVG Arc Gauge (corrected sweep direction) ─── */
function ArcGauge({ rate, enabled }: { rate: number; enabled: boolean }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(() => setReady(true), 400);
    return () => clearTimeout(t);
  }, [enabled]);

  const displayRate = ready ? rate : 0;
  const r = 36; const cx = 56; const cy = 52;

  // Point on circle: angle in degrees (standard math: 0° = right, 90° = up, 180° = left)
  // In SVG y increases downward, so negate sin
  const pt = (deg: number) => ({
    x: cx + r * Math.cos((deg * Math.PI) / 180),
    y: cy - r * Math.sin((deg * Math.PI) / 180),
  });

  // Arc from 180° (left) to 0° (right) through top — sweep=0 (CCW in SVG = goes up)
  const s = pt(180); const e = pt(0);
  const bgPath = `M ${s.x} ${s.y} A ${r} ${r} 0 0 0 ${e.x} ${e.y}`;

  // Foreground: fills from 180° toward 0° proportionally
  const fgEndAngle = 180 - (displayRate / 100) * 180;
  const fgPt = pt(fgEndAngle);
  const large = displayRate > 50 ? 1 : 0;
  const fgPath = displayRate > 0
    ? `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${fgPt.x} ${fgPt.y}`
    : "";

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 112 62" className="w-full h-20 overflow-visible">
        <path d={bgPath} fill="none" stroke="rgba(100,116,139,0.2)" strokeWidth="8" strokeLinecap="round" />
        {fgPath && (
          <path
            d={fgPath}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            stroke="url(#wGrad)"
            style={{ transition: "all 1.1s cubic-bezier(0.34,1.56,0.64,1)" }}
          />
        )}
        <defs>
          <linearGradient id="wGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>
        <text x={cx} y={cy + 2} textAnchor="middle" className="fill-white font-extrabold" fontSize="13">{displayRate}%</text>
        <text x={cx} y={cy + 13} textAnchor="middle" fontSize="7" fill="#64748b">win rate</text>
      </svg>
      <p className="text-[10px] text-center -mt-1" style={{ color: "var(--text-muted)" }}>
        {displayRate === 0 ? "Start bidding to track wins!" : displayRate < 30 ? "Keep going, you're improving!" : "Excellent performance! 🎉"}
      </p>
    </div>
  );
}

/* ─── Spending sparkline (real monthly spend data) ─── */
function SpendingSparkLine({
  spend,
  monthlySpend,
  enabled,
}: {
  spend: number;
  monthlySpend: number[];
  enabled: boolean;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(() => setReady(true), 500);
    return () => clearTimeout(t);
  }, [enabled]);

  const in_lakhs = spend / 100_000;
  const pct = Math.min((in_lakhs / 10) * 100, 100);

  // Build SVG path from real monthly data
  const maxSpend = Math.max(...monthlySpend, 0.01);
  const pts = monthlySpend.map((v, i) => ({
    x: (i / (monthlySpend.length - 1)) * 100,
    y: 40 - (v / maxSpend) * 36,
  }));
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-2 mb-0.5">
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>₹</span>
        <span className="text-white font-extrabold text-2xl leading-none">
          {ready ? in_lakhs.toFixed(1) : "0.0"}
        </span>
        <span className="text-sm pb-0.5" style={{ color: "var(--text-secondary)" }}>L</span>
        <span className="ml-auto text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5">
          <TrendingUp className="w-2.5 h-2.5" /> Total
        </span>
      </div>

      {/* Real sparkline from monthly data */}
      <svg viewBox="0 0 100 44" className="w-full h-10" preserveAspectRatio="none">
        <defs>
          <linearGradient id="spkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </linearGradient>
        </defs>
        {monthlySpend.some(v => v > 0) && (
          <>
            <path d={`${pathD} L 100 44 L 0 44 Z`} fill="url(#spkGrad)" />
            <path
              d={pathD}
              fill="none"
              stroke="#a855f7"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 400,
                strokeDashoffset: ready ? 0 : 400,
                transition: "stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)",
              }}
            />
          </>
        )}
        {!monthlySpend.some(v => v > 0) && (
          <line x1="0" y1="22" x2="100" y2="22" stroke="#475569" strokeWidth="1" strokeDasharray="4 4" />
        )}
      </svg>

      <div className="w-full rounded-full h-1.5" style={{ backgroundColor: "var(--bg-secondary)" }}>
        <div
          className="bg-gradient-to-r from-purple-500 to-pink-400 h-1.5 rounded-full transition-all duration-700"
          style={{ width: ready ? `${pct}%` : "0%", transitionDelay: "500ms" }}
        />
      </div>
      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Total spend across all bids</p>
    </div>
  );
}

export default Dashboard;
