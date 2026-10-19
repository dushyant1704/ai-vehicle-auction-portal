import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Calendar,
  Gauge,
  MapPin,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Loader2,
  TrendingDown,
  TrendingUp,
  Gavel,
  Target,
  Brain,
  ShieldCheck,
  FileText,
  UploadCloud,
  Check,
  XCircle,
  ShieldAlert,
  Camera,
  FileCheck,
  Eye,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import BidModal from "../components/BidModal";
import DocumentVerificationSection from "../components/DocumentVerificationSection";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { computeValuationMetrics } from "../utils/priceEstimator";

/* ── helpers ───────────────────────────────────────────────────── */
function pct(a: number, b: number) {
  return ((Math.abs(a - b) / b) * 100).toFixed(1);
}

function VehicleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { resolvedTheme } = useTheme();
  const { user } = useAuth();
  const isDark = resolvedTheme === "dark";

  // ── Existing state (unchanged) ──────────────────────────────────
  const passedVehicle = location.state as any;
  const [vehicle, setVehicle] = useState<any>(passedVehicle || null);
  const [loading, setLoading] = useState(!passedVehicle);
  const [error, setError] = useState<string | null>(null);
  // ── Bid state ───────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBidSubmitting, setIsBidSubmitting] = useState(false);

  const handleBidSubmit = async (amount: number) => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      toast.error("Please sign in to place a bid.");
      setIsModalOpen(false);
      return;
    }

    setIsBidSubmitting(true);
    try {
      await axios.post(
        "http://localhost:5000/api/bids",
        { vehicleId: vehicle._id, amount },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Also persist to localStorage for MyBids page (offline fallback)
      const newBid = {
        vehicleId: vehicle._id,
        brand: vehicle.brand,
        model: vehicle.model,
        amount,
        time: new Date().toISOString(),
      };
      const existing = JSON.parse(localStorage.getItem("bids") || "[]");
      localStorage.setItem("bids", JSON.stringify([newBid, ...existing]));

      toast.success(`Bid of ₹${Number(amount).toLocaleString("en-IN")} placed successfully!`);
      setIsModalOpen(false);
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to place bid. Please try again.";
      toast.error(msg);
    } finally {
      setIsBidSubmitting(false);
    }
  };
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // ── Existing fetch (unchanged) ──────────────────────────────────
  const fetchVehicle = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await axios.get(
        `http://localhost:5000/api/vehicles/${id}`,
      );
      if (data) {
        data.images = Array.isArray(data.images)
          ? data.images.map((img: any) =>
              typeof img === "string" ? { url: img } : img,
            )
          : [];
        setVehicle(data);
      } else {
        setError("Vehicle not found.");
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError("Vehicle not found in the database. It may have been removed.");
      } else {
        setError("Error fetching vehicle details. Connection failed.");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!passedVehicle) fetchVehicle();
  }, [id, passedVehicle, fetchVehicle]);

  // ── Existing formatter (unchanged) ─────────────────────────────
  const formatCurrency = (value: any): string => {
    if (value === null || value === undefined || isNaN(value)) return "₹0";
    return `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  };

  // ── Valuation metrics (vehicle-specific, realistic Indian pricing) ──
  const metrics = vehicle ? computeValuationMetrics(vehicle) : null;
  const marketPrice    = metrics?.marketPrice    ?? null;
  const insuranceValue = metrics?.insuranceValue ?? null;
  const baseValue      = metrics?.baseValue      ?? null;
  const residualValue  = metrics?.residualValue  ?? null;
  const distressValue  = metrics?.distressValue  ?? null;
  const salvageValue   = metrics?.salvageValue   ?? null;

  // ── NEW: computed fields (no API change) ────────────────────────
  const recommendedBid = metrics?.recommendedBid ?? null;

  const confidenceScore = (() => {
    if (typeof vehicle?.quality_adjusted_confidence === 'number' && vehicle.quality_adjusted_confidence > 0) {
      const val = vehicle.quality_adjusted_confidence;
      return (val > 1 ? val : val * 100).toFixed(1);
    }
    if (!marketPrice) return null;
    let s = 70;
    if (vehicle?.baseValue) s += 8;
    if (vehicle?.insuranceValue) s += 8;
    if (vehicle?.mileage) s += 6;
    if (vehicle?.year) s += 5;
    if (vehicle?.transmission) s += 3;
    return Math.min(s, 97);
  })();

  // ── NEW: granular deal status ───────────────────────────────────
  type DealStatus = {
    label: string;
    sub: string;
    icon: JSX.Element;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    barColor: string;
    barWidth: string; // % of 0-200 scale (100 = fair)
  };

  const getDealStatus = (): DealStatus | null => {
    if (!marketPrice || !vehicle?.price) return null;
    const mp = Number(marketPrice);
    const vp = Number(vehicle.price);
    if (!mp || !vp) return null;
    const ratio = vp / mp;
    const diff  = pct(vp, mp);

    if (ratio < 0.88)
      return {
        label: "Great Deal", sub: `↓ ${diff}% below AI value`,
        icon: <TrendingDown className="w-4 h-4" />,
        badgeBg: "rgba(16,185,129,0.12)", badgeText: "#10b981",
        badgeBorder: "rgba(16,185,129,0.35)", barColor: "#10b981",
        barWidth: `${Math.max(10, (ratio * 100) - 20)}%`,
      };
    if (ratio < 0.97)
      return {
        label: "Good Deal", sub: `↓ ${diff}% below AI value`,
        icon: <TrendingDown className="w-4 h-4" />,
        badgeBg: "rgba(34,197,94,0.12)", badgeText: "#22c55e",
        badgeBorder: "rgba(34,197,94,0.35)", barColor: "#22c55e",
        barWidth: `${(ratio * 100) - 10}%`,
      };
    if (ratio <= 1.05)
      return {
        label: "Fair Price", sub: `Within ${diff}% of AI value`,
        icon: <AlertCircle className="w-4 h-4" />,
        badgeBg: "rgba(99,102,241,0.12)", badgeText: "#818cf8",
        badgeBorder: "rgba(99,102,241,0.35)", barColor: "#6366f1",
        barWidth: "50%",
      };
    if (ratio <= 1.15)
      return {
        label: "Slightly High", sub: `↑ ${diff}% above AI value`,
        icon: <TrendingUp className="w-4 h-4" />,
        badgeBg: "rgba(234,179,8,0.12)", badgeText: "#eab308",
        badgeBorder: "rgba(234,179,8,0.35)", barColor: "#eab308",
        barWidth: "65%",
      };
    return {
      label: "Overpriced", sub: `↑ ${diff}% above AI value`,
      icon: <TrendingUp className="w-4 h-4" />,
      badgeBg: "rgba(239,68,68,0.12)", badgeText: "#ef4444",
      badgeBorder: "rgba(239,68,68,0.35)", barColor: "#ef4444",
      barWidth: "85%",
    };
  };

  const deal = getDealStatus();

  // ── Theme-aware inline style helpers ───────────────────────────
  const card = {
    backgroundColor: "var(--bg-card)",
    border: "1px solid var(--border-color)",
  };
  const surface = {
    backgroundColor: "var(--bg-secondary)",
    border: "1px solid var(--border-color)",
  };

  // ── Loading / error states (unchanged logic) ────────────────────
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div
        className="max-w-2xl mx-auto px-4 py-16 text-center rounded-3xl backdrop-blur-sm shadow-2xl my-12"
        style={card}
      >
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
          {error || "Vehicle Not Found"}
        </h2>
        <p className="mb-8 max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
          We couldn't connect to the database to pull this specific auction item.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => navigate("/auctions")}
            className="px-6 py-3 rounded-xl font-medium transition-colors"
            style={{ ...surface, color: "var(--text-primary)" }}
          >
            ← Back to Auctions
          </button>
          <button
            onClick={() => fetchVehicle()}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-600/20"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const fallbackImage = `https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1200`;
  const images = vehicle.images?.length
    ? vehicle.images.map((i: any) => i.url)
    : [fallbackImage];

  /* ── Spec stat card component (reused 4×) ─── */
  const StatCard = ({
    icon, label, value,
  }: { icon: JSX.Element; label: string; value: string }) => (
    <div className="p-4 rounded-2xl" style={surface}>
      <div className="mb-2 text-indigo-400">{icon}</div>
      <p className="text-sm mb-0.5" style={{ color: "var(--text-secondary)" }}>{label}</p>
      <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{value}</p>
    </div>
  );

  /* ── Valuation row component (reused in breakdown grid) ─── */
  const ValRow = ({
    emoji, label, value, accent = false,
  }: { emoji: string; label: string; value: string; accent?: boolean }) => (
    <div
      className="flex justify-between items-center p-3 rounded-xl transition-colors"
      style={accent
        ? { background: "linear-gradient(90deg,rgba(99,102,241,0.12),rgba(167,139,250,0.08))", border: "1px solid rgba(99,102,241,0.25)" }
        : surface}
    >
      <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
        {emoji} {label}
      </span>
      <span
        className="font-bold text-base"
        style={{ color: accent ? "#818cf8" : "var(--text-primary)" }}
      >
        {value}
      </span>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ── Back button (unchanged logic) ── */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 transition-colors mb-8 group"
        style={{ color: "var(--text-secondary)" }}
        onMouseEnter={e => (e.currentTarget.style.color = "var(--text-primary)")}
        onMouseLeave={e => (e.currentTarget.style.color = "var(--text-secondary)")}
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        Back to Auctions
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* ── LEFT: Image gallery (unchanged) ── */}
        <div className="space-y-4">
          <div
            className="aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl relative group"
            style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)" }}
          >
            <img
              src={images[activeImageIndex]}
              alt={vehicle.model}
              className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
              onError={(e) => { (e.target as HTMLImageElement).src = fallbackImage; }}
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {images.map((img: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative flex-shrink-0 w-24 h-24 rounded-2xl overflow-hidden border-2 transition-all ${
                    activeImageIndex === idx
                      ? "border-indigo-500 opacity-100"
                      : "border-transparent opacity-50 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt="thumbnail" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: Details + Valuation ── */}
        <div className="flex flex-col gap-6">

          {/* Vehicle header (unchanged logic) */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full text-sm font-semibold border border-indigo-500/20">
                Lot #{vehicle._id?.substring(0, 8).toUpperCase()}
              </span>
              <span className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                <MapPin className="w-4 h-4" /> {vehicle.location || "India"}
              </span>
            </div>
            <h1
              className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3"
              style={{ color: "var(--text-primary)" }}
            >
              {vehicle.brand}{" "}
              <span style={{ color: "var(--text-secondary)" }}>{vehicle.model}</span>
            </h1>
            <div className="flex items-baseline gap-4 mb-1">
              <span className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
                {vehicle.price ? `₹${vehicle.price.toLocaleString()}` : "₹N/A"}
              </span>
              <span className="font-medium" style={{ color: "var(--text-secondary)" }}>
                Estimated Asking Price
              </span>
            </div>
          </div>

          {/* Spec stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={<Calendar className="w-5 h-5" />} label="Year" value={String(vehicle.year || "N/A")} />
            <StatCard icon={<Gauge className="w-5 h-5" />} label="Mileage" value={vehicle.mileage ? `${vehicle.mileage.toLocaleString()} km` : "N/A"} />
            <StatCard icon={<CheckCircle className="w-5 h-5" />} label="Condition" value={vehicle.condition || "Used"} />
            <StatCard icon={<MapPin className="w-5 h-5" />} label="Fuel" value={vehicle.fuel || "N/A"} />
          </div>

          {/* ══════════════════════════════════════════
              DAMAGE REPORT SECTION
              ══════════════════════════════════════════ */}
          {vehicle.damages && vehicle.damages.length > 0 && (
            <div
              className="rounded-2xl overflow-hidden relative"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid rgba(239,68,68,0.3)",
                boxShadow: "0 4px 16px rgba(239,68,68,0.10)",
              }}
            >
              <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: "rgba(239,68,68,0.2)" }}>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  Damage Analysis Report
                </h3>
              </div>

              <div className="px-6 py-5 space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-900/50 p-4 rounded-lg">
                    <p className="text-xs text-slate-400">Total Damages</p>
                    <p className="text-2xl font-bold text-white">
                      {vehicle.damage_summary?.total_damages || 0}
                    </p>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-lg">
                    <p className="text-xs text-slate-400">Severity</p>
                    <p className="text-xl font-bold text-amber-400 capitalize">
                      {vehicle.damage_summary?.severity_level || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-lg">
                    <p className="text-xs text-slate-400">Categories</p>
                    <p className="text-sm text-slate-300 capitalize">
                      {vehicle.damage_summary?.categories?.join(', ') || 'None'}
                    </p>
                  </div>
                </div>

                {/* Damage List */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase">Detected Damages</p>
                  {vehicle.damages.map((dmg: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg">
                      <span className="text-sm font-medium text-slate-300 capitalize">
                        {dmg.type}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs px-2 py-1 bg-slate-800 rounded text-slate-300">
                          {(typeof dmg.confidence === 'number' ? (dmg.confidence <= 1 ? dmg.confidence * 100 : dmg.confidence) : 90).toFixed(1)}% confidence
                        </span>
                        <span className={`text-xs px-2 py-1 rounded font-bold capitalize ${
                          dmg.severity === 'minor' ? 'bg-green-500/20 text-green-400' :
                          dmg.severity === 'moderate' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {dmg.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Annotated Images */}
                {vehicle.annotated_images && vehicle.annotated_images.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase">
                      Annotated Images
                    </p>
                    <div className="grid grid-cols-5 gap-2">
                      {vehicle.annotated_images.map((url: string, idx: number) => (
                        <img
                          key={idx}
                          src={url}
                          alt={`Annotated ${idx + 1}`}
                          className="w-full h-20 object-cover rounded-lg border border-slate-600 hover:border-indigo-500 cursor-pointer transition-colors"
                          onClick={() => window.open(url, '_blank')}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Pricing Impact */}
                {vehicle.xgboost_base_price && vehicle.damage_penalty_percent !== undefined && (
                  <div className="p-4 bg-slate-900/50 rounded-lg space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-3">
                      Damage Impact on Pricing
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">XGBoost Base Price:</span>
                        <span className="font-bold text-white">
                          {formatCurrency(vehicle.xgboost_base_price)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Damage Penalty:</span>
                        <span className="font-bold text-red-400">
                          -{vehicle.damage_penalty_percent.toFixed(1)}%
                        </span>
                      </div>
                      {vehicle.damage_adjusted_price && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Damage Adjusted Price:</span>
                          <span className="font-bold text-amber-400">
                            {formatCurrency(vehicle.damage_adjusted_price)}
                          </span>
                        </div>
                      )}
                      {vehicle.final_valuation && (
                        <div className="flex justify-between pt-2 border-t border-slate-700">
                          <span className="text-slate-300 font-bold">Final Valuation (80/20):</span>
                          <span className="font-bold text-green-400">
                            {formatCurrency(vehicle.final_valuation)}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-3">
                      * Final price = (XGBoost × 80%) + (Damage Adjusted × 20%)
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════
              PREMIUM AI VALUATION PANEL
              ══════════════════════════════════════════ */}
          <div
            className="rounded-3xl overflow-hidden relative"
            style={{
              background: isDark
                ? "linear-gradient(135deg, rgba(15,23,42,0.96) 0%, rgba(30,20,60,0.92) 100%)"
                : "linear-gradient(135deg, rgba(255,255,255,0.97) 0%, rgba(238,235,255,0.9) 100%)",
              border: "1px solid rgba(99,102,241,0.28)",
              boxShadow: isDark
                ? "0 0 48px rgba(99,102,241,0.10), inset 0 1px 0 rgba(255,255,255,0.06)"
                : "0 4px 32px rgba(99,102,241,0.10), inset 0 1px 0 rgba(255,255,255,0.8)",
            }}
          >
            {/* Glow blobs */}
            <div className="absolute top-0 right-0 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl -ml-12 -mb-12 pointer-events-none" />

            {/* ── Panel header ── */}
            <div className="relative z-10 px-6 pt-6 pb-4 border-b" style={{ borderColor: "rgba(99,102,241,0.18)" }}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                      <Brain className="w-4 h-4 text-white" />
                    </div>
                    <span
                      className="text-xs font-bold uppercase tracking-widest"
                      style={{ color: "#818cf8" }}
                    >
                      AI True Valuation
                    </span>
                    {confidenceScore && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: "rgba(16,185,129,0.14)",
                          color: "#10b981",
                          border: "1px solid rgba(16,185,129,0.3)",
                        }}
                      >
                        {confidenceScore}% confident
                      </span>
                    )}
                  </div>
                  <p className="text-sm max-w-xs" style={{ color: "var(--text-secondary)" }}>
                    Neural network analyzes <strong style={{ color: "var(--text-primary)" }}>{vehicle.brand}</strong> data alongside realtime market depreciation.
                  </p>
                </div>

                {/* AI Price + Deal badge */}
                {marketPrice ? (
                  <div className="text-right shrink-0">
                    <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
                      AI Predicted Value
                    </div>
                    <div
                      className="text-3xl font-extrabold tracking-tight"
                      style={{
                        background: "linear-gradient(135deg,#818cf8,#c084fc)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}
                    >
                      {formatCurrency(marketPrice)}
                    </div>
                    {deal && (
                      <div
                        className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-xl text-xs font-bold"
                        style={{
                          background: deal.badgeBg,
                          color: deal.badgeText,
                          border: `1px solid ${deal.badgeBorder}`,
                        }}
                      >
                        {deal.icon} {deal.label} · {deal.sub}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm italic" style={{ color: "var(--text-muted)" }}>
                    AI Valuation available in list view
                  </div>
                )}
              </div>

              {/* Deal strength bar */}
              {deal && (
                <div className="mt-4">
                  <div className="flex justify-between text-[10px] font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                    <span>Distress</span><span>Market</span><span>Insurance</span>
                  </div>
                  <div
                    className="w-full h-2.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: deal.barWidth, backgroundColor: deal.barColor, boxShadow: `0 0 8px ${deal.barColor}80` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── Breakdown grid ── */}
            {marketPrice && (
              <div className="relative z-10 px-6 py-5 space-y-3">
                <p
                  className="text-[10px] font-bold uppercase tracking-widest mb-3"
                  style={{ color: "var(--text-muted)" }}
                >
                  Complete Valuation Breakdown
                </p>

                {/* Primary row — AI Market Price */}
                <ValRow emoji="🎯" label="AI Market Price" value={formatCurrency(marketPrice)} accent />

                {/* Grid of secondary values */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <ValRow emoji="🛡️" label="Insurance Value (IDV)" value={formatCurrency(insuranceValue)} />
                  <ValRow emoji="📊" label="Base Depreciated Value" value={formatCurrency(baseValue)} />
                  <ValRow emoji="📈" label="Residual Value (3 yrs)" value={formatCurrency(residualValue)} />
                  <ValRow emoji="⚡" label="Distress / Quick Sale" value={formatCurrency(distressValue)} />
                </div>

                <ValRow emoji="♻️" label="Salvage Value (Scrap)" value={formatCurrency(salvageValue)} />

                {/* Recommended Bid */}
                {recommendedBid && (
                  <div
                    className="flex justify-between items-center p-4 rounded-2xl mt-2"
                    style={{
                      background: "linear-gradient(90deg, rgba(16,185,129,0.10), rgba(6,182,212,0.08))",
                      border: "1px solid rgba(16,185,129,0.28)",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-emerald-400" />
                      <div>
                        <div className="text-sm font-bold text-emerald-400">Recommended Bid</div>
                        <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>~9% below AI • best value entry</div>
                      </div>
                    </div>
                    <div className="text-xl font-extrabold text-emerald-400">
                      {formatCurrency(recommendedBid)}
                    </div>
                  </div>
                )}

                {/* How it works footnote */}
                <div
                  className="text-xs p-3 rounded-xl"
                  style={{ backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", border: "1px solid var(--border-color)", color: "var(--text-muted)" }}
                >
                  📝 <strong>How it works:</strong> ML model predicts fair market value. All other values derived using Indian market financial standards.
                </div>
              </div>
            )}
          </div>

          {/* ── Bid button (with RBAC enforcement) ── */}
          <div className="mt-auto">
            {user && (user.id === vehicle.sellerId || (user as any)._id === vehicle.sellerId) ? (
              <div className="w-full p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-center font-semibold text-sm flex items-center justify-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                You are the seller of this vehicle. Self-bidding is strictly prohibited.
              </div>
            ) : user && user.role === "admin" ? (
              <div className="w-full p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-center font-semibold text-sm flex items-center justify-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                Administrator View Mode (Bidding disabled for admins).
              </div>
            ) : (
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-lg font-bold py-4 rounded-2xl shadow-xl shadow-indigo-600/20 transition-all hover:-translate-y-0.5"
              >
                <Gavel className="w-6 h-6" /> Place Secure Bid
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          FORENSIC EXIF METADATA & IMAGE INTEGRITY SECTION
          ══════════════════════════════════════════════════════════════════ */}
      <div className="mt-12 rounded-3xl p-6 sm:p-8" style={surface}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b" style={{ borderColor: "var(--border-color)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                Image EXIF & Forensic Metadata Inspection
              </h3>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Automated multi-angle timestamp consistency, device signature, and capture authenticity validation.
              </p>
            </div>
          </div>
          <div>
            {(() => {
              const exif = vehicle.exifValidation;
              const status = exif?.status || "NO_METADATA";
              if (status === "VALID") {
                return (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    <ShieldCheck className="w-4 h-4" /> Authentic Capture Verified
                  </span>
                );
              }
              if (status === "INCONSISTENT" || status === "FLAGGED") {
                return (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    <ShieldAlert className="w-4 h-4" /> Integrity Review Advisory
                  </span>
                );
              }
              return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-500/10 border border-slate-500/30 text-slate-400">
                  <Camera className="w-4 h-4" /> Standard Metadata Profile (Privacy Stripped)
                </span>
              );
            })()}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Capture Hardware
            </p>
            <p className="text-sm font-bold text-white">
              {vehicle.exifValidation?.camera_models?.length
                ? vehicle.exifValidation.camera_models.join(", ")
                : "Camera model omitted / Web export"}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {vehicle.exifValidation?.camera_models?.length ? "Hardware signature logged" : "No device fingerprints retained"}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Timestamp Consistency
            </p>
            <p className="text-sm font-bold text-white">
              {vehicle.exifValidation?.timestamp_range?.earliest
                ? `${new Date(vehicle.exifValidation.timestamp_range.earliest).toLocaleDateString()} — ${new Date(vehicle.exifValidation.timestamp_range.latest).toLocaleDateString()}`
                : "Timestamp metadata stripped"}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {vehicle.exifValidation?.timestamp_range
                ? `Span: ${vehicle.exifValidation.timestamp_range.span_days} days`
                : "Safe neutral baseline applied"}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              GPS & Geotag Integrity
            </p>
            <p className="text-sm font-bold text-white">
              {vehicle.exifValidation?.gps_present
                ? "Coordinates Verified (Masked)"
                : "No Location Tags Present"}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Privacy-first: Coordinates inspected without exposing private locations
            </p>
          </div>
        </div>

        {vehicle.exifValidation?.findings && vehicle.exifValidation.findings.length > 0 && (
          <div className="mt-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Inspector System Findings
            </p>
            <ul className="space-y-1 text-xs text-slate-300">
              {vehicle.exifValidation.findings.map((f: string, idx: number) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          VEHICLE DOCUMENT VERIFICATION & COMPLIANCE WORKFLOW
          ══════════════════════════════════════════════════════════════════ */}
      <div className="mt-8">
        <DocumentVerificationSection
          vehicleId={id as string}
          vehicle={vehicle}
          onVerificationUpdate={fetchVehicle}
        />
      </div>

      {/* ── BidModal (unchanged logic) ── */}
      <BidModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        vehiclePrice={vehicle.price}
        isSubmitting={isBidSubmitting}
        onSubmit={handleBidSubmit}
      />
    </div>
  );
}

export default VehicleDetails;
