import {
  Calendar,
  Gauge,
  Eye,
  Gavel,
  Sparkles,
  TrendingDown,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import BidModal from "./BidModal";
import { useTheme } from "../context/ThemeContext";
import { getSmartMarketPrice } from "../utils/priceEstimator";

interface Vehicle {
  _id: string;
  brand: string;
  model: string;
  year: number;
  mileage: number;
  price: number;
  engine: number;
  max_power: number;
  seats: number;
  fuel: string;
  transmission: string;
  vehicle_age: number;
  images?: { url: string }[];
  marketPrice?: number;
  insuranceValue?: number;
  baseValue?: number;
  residualValue?: number;
  distressValue?: number;
  salvageValue?: number;
}

interface VehicleCardProps {
  vehicle: Vehicle;
}

function VehicleCard({ vehicle }: VehicleCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  /* Compute vehicle-specific AI market price (replaces uniform backend ₹800k) */
  const smartMarketPrice = getSmartMarketPrice(vehicle);

  /* Badge changes per theme — dark on dark bg, white on light bg */
  const priceBadgeStyle: React.CSSProperties = isDark
    ? {
        backgroundColor: "rgba(2, 6, 23, 0.88)",
        color: "#f8fafc",
        border: "1px solid rgba(255,255,255,0.1)",
      }
    : {
        backgroundColor: "rgba(255, 255, 255, 0.92)",
        color: "#0f172a",
        border: "1px solid rgba(0,0,0,0.08)",
      };

  const formatCurrency = (value: any): string => {
    if (value === null || value === undefined || isNaN(value)) {
      return "N/A";
    }
    const num = Number(value);
    return num > 0 ? `₹${num.toLocaleString()}` : "N/A";
  };

  const fallbackImage =
    "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800";
  const vehicleImage =
    vehicle.images && vehicle.images.length > 0 && vehicle.images[0]?.url
      ? vehicle.images[0].url
      : fallbackImage;
  const currentImgSrc = imageError ? fallbackImage : vehicleImage;

  const getDealIndicator = () => {
    const marketPrice = smartMarketPrice;
    if (!marketPrice || !vehicle.price) return null;

    const difference = marketPrice - vehicle.price;
    void difference; // used implicitly via percentDiff below

    if (
      vehicle.price <= marketPrice * 1.05 &&
      vehicle.price >= marketPrice * 0.95
    ) {
      return (
        <div
          className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border"
          style={{
            backgroundColor: "var(--bg-secondary)",
            color: "var(--text-secondary)",
            borderColor: "var(--border-color)",
          }}
        >
          <AlertCircle className="w-3 h-3" /> Fair
        </div>
      );
    }

    if (vehicle.price < marketPrice) {
      return (
        <div className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <TrendingDown className="w-3 h-3" />
          Good Deal
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
        <TrendingUp className="w-3 h-3" />
        Overpriced
      </div>
    );
  };

  return (
    <>
      {/* ── Card container — uses CSS variable so it reacts to theme ── */}
      <div
        className="group relative rounded-2xl overflow-hidden flex flex-col h-full shadow-xl transition-all duration-300 hover:shadow-indigo-500/20 hover:-translate-y-1"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-color)",
        }}
        onMouseEnter={() => {}}
        onMouseLeave={() => {}}
      >
        {/* Hover overlay — unchanged */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl" />

        {/* ── Image section ── */}
        <div
          className="h-56 overflow-hidden relative"
          style={{ backgroundColor: "var(--bg-secondary)" }}
        >
          <img
            src={currentImgSrc}
            alt={`${vehicle.brand} ${vehicle.model}`}
            onError={() => setImageError(true)}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />

          {/* Price badge — theme-aware */}
          <div
            className="absolute bottom-3 left-3 backdrop-blur-md px-3 py-1.5 rounded-lg font-bold tracking-tight shadow-xl transition-all duration-300"
            style={priceBadgeStyle}
          >
            {formatCurrency(vehicle.price)}
          </div>
        </div>

        {/* ── Card body ── */}
        <div className="p-5 flex flex-col flex-grow z-10 relative">

          {/* Title + deal badge */}
          <div className="flex justify-between items-start mb-2">
            <h2
              className="text-xl font-bold truncate pr-4"
              style={{ color: "var(--text-primary)" }}
            >
              {vehicle.brand} {vehicle.model}
            </h2>
            {getDealIndicator()}
          </div>

          {/* Stat chips (Year / Mileage) */}
          <div
            className="flex items-center gap-3 mt-3 text-sm font-medium mb-5 flex-wrap"
            style={{ color: "var(--text-secondary)" }}
          >
            <span
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md"
              style={{
                backgroundColor: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
                color: "var(--text-secondary)",
              }}
            >
              <Calendar size={14} className="text-indigo-400" />{" "}
              {vehicle.year || "N/A"}
            </span>
            <span
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md"
              style={{
                backgroundColor: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
                color: "var(--text-secondary)",
              }}
            >
              <Gauge size={14} className="text-indigo-400" />{" "}
              {vehicle.mileage
                ? `${Number(vehicle.mileage).toLocaleString()} km`
                : "N/A"}
            </span>
          </div>

          {/* AI Valuation row — always shown using smart computed price */}
          <div className="mb-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-3 flex justify-between items-center">
            <span className="text-sm font-semibold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 flex items-center gap-2">
              <Sparkles size={14} className="text-indigo-400" /> AI Valuation
            </span>
            <span
              className="font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {formatCurrency(smartMarketPrice)}
            </span>
          </div>

          {/* Check AI Price button */}
          <button
            onClick={() =>
              vehicle._id &&
              navigate(`/vehicle/${vehicle._id}`, { state: vehicle })
            }
            className="w-full mb-4 relative overflow-hidden group/ai flex items-center justify-center gap-2 border border-indigo-500/30 text-indigo-400 py-2.5 rounded-xl hover:text-white hover:bg-indigo-500/20 transition-all duration-300"
            style={{ backgroundColor: "var(--bg-card)" }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 opacity-0 group-hover/ai:opacity-100 transition-opacity duration-300" />
            <Sparkles size={16} />
            Check AI Price
          </button>

          {/* Details + Bid buttons */}
          <div className="flex flex-col gap-2 mt-auto">
            <div className="flex gap-2">
              <button
                onClick={() =>
                  vehicle._id &&
                  navigate(`/vehicle/${vehicle._id}`, { state: vehicle })
                }
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-colors font-medium shadow-sm"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                }}
              >
                <Eye size={16} /> Details
              </button>

              <button
                onClick={() => setIsModalOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-br from-indigo-600 to-purple-600 text-white py-2.5 rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-colors shadow-lg shadow-indigo-600/20 font-medium border border-indigo-500/30"
              >
                <Gavel size={16} /> Bid
              </button>
            </div>
          </div>
        </div>
      </div>

      <BidModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        vehiclePrice={vehicle.price}
        onSubmit={(amount) => {
          const newBid = {
            vehicleId: vehicle._id,
            brand: vehicle.brand,
            model: vehicle.model,
            amount,
            time: new Date().toISOString(),
          };
          const existingBids = JSON.parse(localStorage.getItem("bids") || "[]");
          localStorage.setItem(
            "bids",
            JSON.stringify([newBid, ...existingBids]),
          );
          toast.success(
            `Secure bid placed: ₹${Number(amount).toLocaleString("en-IN")}`,
          );
          setIsModalOpen(false);
        }}
      />
    </>
  );
}

export default VehicleCard;
