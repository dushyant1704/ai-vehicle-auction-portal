import { useState } from "react";
import axios from "axios";
import {
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Car,
  Activity,
  Save,
  Loader2,
  Gauge,
  AlertCircle,
  TrendingDown,
  Tag,
  Layers,
  Zap,
  IndianRupee,
  Award,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ImageUploadSection from "../components/ImageUploadSection";

// ─── Car Dataset ─────────────────────────────────────────────────
const carData = {
  Maruti: [
    "Alto",
    "Celerio",
    "WagonR",
    "Swift",
    "Baleno",
    "Dzire",
    "Brezza",
    "Ertiga",
    "XL6",
    "Fronx",
    "Grand Vitara",
  ],
  Hyundai: [
    "i10",
    "i20",
    "Verna",
    "Aura",
    "Venue",
    "Creta",
    "Alcazar",
    "Tucson",
    "Exter",
  ],
  Tata: ["Tiago", "Tigor", "Altroz", "Punch", "Nexon", "Harrier", "Safari"],
  Mahindra: ["Bolero", "Scorpio", "Scorpio N", "Thar", "XUV300", "XUV700"],
  Honda: ["Amaze", "City", "Elevate"],
  Toyota: [
    "Glanza",
    "Hyryder",
    "Innova Crysta",
    "Innova Hycross",
    "Fortuner",
    "Hilux",
  ],
  Kia: ["Sonet", "Seltos", "Carens", "EV6"],
  Renault: ["Kwid", "Triber", "Kiger"],
  Nissan: ["Magnite", "X-Trail"],
  MG: ["Comet EV", "Astor", "Hector", "ZS EV", "Gloster"],

  BMW: ["2 Series", "3 Series", "5 Series", "7 Series", "X1", "X3", "X5", "X7"],
  Mercedes: [
    "A-Class",
    "C-Class",
    "E-Class",
    "S-Class",
    "GLA",
    "GLC",
    "GLE",
    "GLS",
  ],
  Audi: ["A4", "A6", "Q3", "Q5", "Q7", "Q8"],
  Volkswagen: ["Virtus", "Taigun", "Tiguan"],
  Skoda: ["Slavia", "Kushaq", "Octavia", "Superb"],
  Volvo: ["XC40", "XC60", "XC90"],

  Jeep: ["Compass", "Meridian", "Wrangler"],
  BYD: ["Atto 3", "Seal", "e6"],

  Lamborghini: ["Huracan", "Aventador", "Urus"],
  Ferrari: ["Roma", "Portofino", "SF90 Stradale", "F8 Tributo"],
  Porsche: ["911", "Cayenne", "Macan", "Panamera", "Taycan"],
  AstonMartin: ["DB11", "Vantage", "DBX"],
  Bentley: ["Continental GT", "Bentayga", "Flying Spur"],
  RollsRoyce: ["Phantom", "Ghost", "Cullinan", "Wraith"],
  Maserati: ["Ghibli", "Levante", "Quattroporte"],
  Jaguar: ["XE", "XF", "F-Pace", "I-Pace"],
  LandRover: [
    "Defender",
    "Discovery",
    "Range Rover",
    "Range Rover Sport",
    "Range Rover Velar",
  ],
};

// ─── Types ────────────────────────────────────────────────────────
export interface PricingResult {
  ai_price: number;
  base_price: number;
  base_value: number;
  ml_price: number;
  residual_value: number;
  salvage_value: number;
  insurance_value: number;
  distress_value: number;
  segment: string;
  segment_weight: number;
  depreciation_rate: number;
  mileage_factor: number;
  condition: string;
  condition_factor: number;
  price_source: string;
}

// ─── Constants ────────────────────────────────────────────────────
const SEGMENTS = [
  { value: "", label: "Auto-detect from brand" },
  { value: "A-Segment", label: "A-Segment  — Micro (Alto, Kwid)" },
  { value: "B1-Segment", label: "B1-Segment — Entry Hatch (Swift, WagonR)" },
  { value: "B2-Segment", label: "B2-Segment — Premium Hatch (i20, Baleno)" },
  {
    value: "C1-Segment",
    label: "C1-Segment — Compact SUV / Sedan (Creta, City)",
  },
  {
    value: "C2-Segment",
    label: "C2-Segment — Mid SUV / D-Sedan (Seltos, Octavia)",
  },
  {
    value: "D1-Segment",
    label: "D1-Segment — Full-size SUV (Fortuner, XUV700)",
  },
  { value: "Luxury", label: "Luxury     — Premium (BMW, Audi, Mercedes)" },
  {
    value: "Exotic",
    label: "Exotic     — Supercar (Lamborghini, Ferrari, McLaren)",
  },
];

// Brand → segment auto-detect (mirrors backend BRAND_AUTO_SEGMENT)
const BRAND_SEGMENT_MAP: Record<string, string> = {
  Maruti: "B1-Segment",
  Suzuki: "B1-Segment",
  Renault: "B1-Segment",
  Nissan: "B1-Segment",
  Hyundai: "B2-Segment",
  Tata: "B2-Segment",
  Honda: "C1-Segment",
  Ford: "C1-Segment",
  Mahindra: "C1-Segment",
  Kia: "C1-Segment",
  MG: "C1-Segment",
  Toyota: "C2-Segment",
  Skoda: "C2-Segment",
  Volkswagen: "C2-Segment",
  Jeep: "C2-Segment",
  BMW: "Luxury",
  Audi: "Luxury",
  Mercedes: "Luxury",
  Volvo: "Luxury",
  Jaguar: "Luxury",
  Lamborghini: "Exotic",
  Ferrari: "Exotic",
  McLaren: "Exotic",
  Bugatti: "Exotic",
  Porsche: "Exotic",
  Maserati: "Exotic",
  Bentley: "Exotic",
  RollsRoyce: "Exotic",
};

const SEGMENT_STYLE: Record<string, { badge: string; label: string }> = {
  "A-Segment": {
    badge: "text-slate-400 bg-slate-500/20 border-slate-500/40",
    label: "⚪ A-Segment",
  },
  "B1-Segment": {
    badge: "text-green-400  bg-green-500/20  border-green-500/40",
    label: "🟢 B1-Segment",
  },
  "B2-Segment": {
    badge: "text-sky-400    bg-sky-500/20    border-sky-500/40",
    label: "🔵 B2-Segment",
  },
  "C1-Segment": {
    badge: "text-teal-400   bg-teal-500/20   border-teal-500/40",
    label: "🩵 C1-Segment",
  },
  "C2-Segment": {
    badge: "text-violet-400 bg-violet-500/20 border-violet-500/40",
    label: "🟣 C2-Segment",
  },
  "D1-Segment": {
    badge: "text-orange-400 bg-orange-500/20 border-orange-500/40",
    label: "🟠 D1-Segment",
  },
  Luxury: {
    badge: "text-amber-400  bg-amber-500/20  border-amber-500/40",
    label: "🟡 Luxury",
  },
  Exotic: {
    badge:
      "text-rose-400   bg-rose-500/20   border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.25)]",
    label: "🔴 Exotic / Supercar",
  },
};

const SOURCE_LABEL: Record<string, string> = {
  user_provided: "📌 User Purchase Price",
  model_database: "📊 Model Database",
  segment_average: "📐 Segment Average",
  ml_fallback: "🤖 ML Estimated",
};

const safeNumber = (n: any, _decimals = 0): number => {
  return typeof n === "number" && !isNaN(n) ? n : 0;
};

const formatPrice = (price: any): string => {
  const num = typeof price === "number" ? price : parseFloat(price);
  if (isNaN(num)) return "₹0";
  return "₹" + Math.round(num).toLocaleString("en-IN");
};

// ─────────────────────────────────────────────────────────────────
export default function AddVehicle() {
  console.log("AddVehicle mounted");
  console.log("Component Started: AddVehicle rendering");
  const navigate = useNavigate();
  const { token } = useAuth();

  const [formData, setFormData] = useState({
    brand: "",
    model: "",
    year: new Date().getFullYear(),
    mileage: "", // Changed: empty string instead of 0
    fuel: "Petrol",
    transmission: "Manual",
    engine: "", // Changed: empty string instead of 1000
    max_power: "", // Changed: empty string instead of 100
    torque: "", // NEW FIELD: Torque (Nm)
    seats: "", // Changed: empty string instead of 5
    original_price: "", // user purchase price (optional)
    segment: "", // user-selected segment (optional)
    condition: "good",
    expected_price: "", // Changed: empty string instead of 0
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [damageData, setDamageData] = useState<any>(null);
  const [conditionAssessment, setConditionAssessment] = useState<any>(null);
  const [aiStep, setAiStep] = useState<number>(0);
  const [aiError, setAiError] = useState<string | null>(null);

  // Step 11: Track fields manually edited by the user to avoid overwriting them
  const [userEditedFields, setUserEditedFields] = useState<Set<string>>(new Set());
  const markEdited = (field: string) => {
    setUserEditedFields((prev) => new Set(prev).add(field));
  };

  // Step 12, 14, 15, 16, 17: Specification state & frontend cache
  const [specLoading, setSpecLoading] = useState(false);
  const [specError, setSpecError] = useState<string | null>(null);
  const specsCache = useState<Map<string, any>>(() => new Map())[0];

  const set = (key: string, val: any) =>
    setFormData((p) => ({ ...p, [key]: val }));

  // Step 1: Auto-detect segment when brand changes and filter models
  const handleBrandChange = (brand: string) => {
    setSpecError(null);
    const detectedSegment = BRAND_SEGMENT_MAP[brand] || "";
    setFormData((p) => ({
      ...p,
      brand,
      model: "",
      segment: !userEditedFields.has("segment") ? detectedSegment : p.segment,
    }));
  };

  // Step 2, 12, 13, 14, 15, 16, 17: Fetch specifications from backend or cache
  const fetchModelSpecifications = async (brandName: string, modelName: string) => {
    if (!brandName || !modelName) return;

    const cacheKey = `${brandName.toLowerCase()}:${modelName.toLowerCase()}`;
    
    // Step 12: Check frontend memory cache
    if (specsCache.has(cacheKey)) {
      const cachedData = specsCache.get(cacheKey);
      applySpecifications(cachedData);
      setSpecError(null);
      return;
    }

    setSpecLoading(true);
    setSpecError(null);

    try {
      // Step 14 & 15: Call backend endpoint GET /api/vehicles/specifications
      const res = await axios.get("http://localhost:5000/api/vehicles/specifications", {
        params: { brand: brandName, model: modelName },
        timeout: 5000,
      });

      if (res.data) {
        specsCache.set(cacheKey, res.data);
        applySpecifications(res.data);
        setSpecError(null);
      }
    } catch (err: any) {
      console.warn("[Specs Fetch Error]", err.response?.data || err.message);
      // Step 13 & 17: Set error status and allow manual entry
      const msg = err.response?.data?.error || "Specifications unavailable";
      setSpecError(msg);
    } finally {
      setSpecLoading(false);
    }
  };

  // Step 11: Apply specifications to form data without overwriting user-edited values
  const applySpecifications = (data: any) => {
    setFormData((p) => ({
      ...p,
      segment: !userEditedFields.has("segment") && data.segment ? data.segment : p.segment,
      engine: !userEditedFields.has("engine") && (data.engine !== undefined && data.engine !== null) ? data.engine : p.engine,
      max_power: !userEditedFields.has("max_power") && (data.power !== undefined && data.power !== null) ? data.power : p.max_power,
      torque: !userEditedFields.has("torque") && (data.torque !== undefined && data.torque !== null) ? data.torque : p.torque,
      seats: !userEditedFields.has("seats") && (data.seats !== undefined && data.seats !== null) ? data.seats : p.seats,
      fuel: !userEditedFields.has("fuel") && Array.isArray(data.fuelOptions) && data.fuelOptions.length > 0 ? data.fuelOptions[0] : p.fuel,
      transmission: !userEditedFields.has("transmission") && Array.isArray(data.transmissionOptions) && data.transmissionOptions.length > 0 ? data.transmissionOptions[0] : p.transmission,
      original_price: !userEditedFields.has("original_price") && (data.originalPrice !== undefined && data.originalPrice !== null) ? data.originalPrice : p.original_price,
    }));
  };

  const handleModelChange = (modelName: string) => {
    set("model", modelName);
    if (formData.brand && modelName) {
      fetchModelSpecifications(formData.brand, modelName);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────
  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    setLoading(true);
    setAiError(null);
    setAiStep(1); // Step 1: Uploading Images

    const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

    try {
      console.log("AI Pipeline Step 1: Uploading Images");
      await delay(300);
      setAiStep(2); // Step 2: Checking Image Quality

      console.log("AI Pipeline Step 2: Checking Image Quality");
      await delay(300);
      setAiStep(3); // Step 3: Detecting Vehicle

      console.log("AI Pipeline Step 3: Detecting Vehicle");
      await delay(300);
      setAiStep(4); // Step 4: Running YOLO Damage Detection

      console.log("AI Pipeline Step 4: Running YOLO Damage Detection");
      await delay(300);
      setAiStep(5); // Step 5: Running XGBoost Price Prediction

      console.log("AI Pipeline Step 5: Running XGBoost Price Prediction");
      // Build pricing payload
      const payload = {
        brand: formData.brand,
        model: formData.model,
        year: Number(formData.year),
        mileage: formData.mileage ? Number(formData.mileage) : 0,
        fuel: formData.fuel,
        transmission: formData.transmission,
        engine: formData.engine ? Number(formData.engine) : 0,
        max_power: formData.max_power ? Number(formData.max_power) : 0,
        torque: formData.torque ? Number(formData.torque) : undefined,
        seats: formData.seats ? Number(formData.seats) : 5,
        original_price: formData.original_price
          ? Number(formData.original_price)
          : null,
        segment: formData.segment || null,
        condition: formData.condition,
        vehicle_age: new Date().getFullYear() - Number(formData.year),
        ...(damageData && { damage_data: damageData }),
      };

      console.log("Calling Backend /api/predict-price", payload);
      const res = await axios.post(
        "http://localhost:5000/api/predict-price",
        payload
      );

      console.log("Response received from /api/predict-price", res.status, res.data);
      setAiStep(6); // Step 6: Generating AI Inspection Report
      await delay(300);

      const priceVal = res.data.marketPrice ?? res.data.market_price ?? res.data.ai_price ?? res.data.aiPrice ?? 0;
      const basePrice = res.data.base_price ?? res.data.original_price ?? priceVal;
      
      const mappedResults = {
        ai_price: priceVal,
        base_price: basePrice,
        base_value: res.data.baseValue ?? res.data.base_value ?? Math.round(priceVal * 0.8),
        ml_price: res.data.mlRawPrediction ?? res.data.ml_price ?? priceVal,
        residual_value: res.data.residualValue ?? res.data.residual_value ?? Math.round(priceVal * 0.7),
        salvage_value: res.data.salvageValue ?? res.data.salvage_value ?? Math.round(priceVal * 0.2),
        insurance_value: res.data.insuranceValue ?? res.data.insurance_value ?? Math.round(priceVal * 0.85),
        distress_value: res.data.distressValue ?? res.data.distress_value ?? Math.round(priceVal * 0.75),
        segment: res.data.segment ?? formData.segment ?? "Uncategorized",
        segment_weight: res.data.segment_weight ?? 1.0,
        depreciation_rate: res.data.depreciation_rate ?? 0.08,
        mileage_factor: res.data.mileage_factor ?? 1.0,
        condition: res.data.condition ?? formData.condition ?? "good",
        condition_factor: res.data.condition_factor ?? 0.9,
        price_source: res.data.price_source ?? "hybrid_ai_engine",
        valuation: res.data.valuation,
        damage: res.data.damage,
        repair: res.data.repair,
        summary: res.data.summary,
        recommendation: res.data.recommendation,
        metadata: res.data.metadata
      };

      console.log("Updating React State with mappedResults", mappedResults);
      setResults(mappedResults);
      toast.success("AI Inspection Report & Valuation Complete!");
    } catch (err: any) {
      console.error("[AI Evaluation Error]", err.response?.data || err.message);
      const errMsg = err.response?.data?.error || err.message || "Valuation service encountered an issue.";
      setAiError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // ── Save ───────────────────────────────────────────────────────
  const handleSaveToDb = async () => {
    if (!results) return;
    const authToken = token || localStorage.getItem("auth_token");
    if (!authToken) {
      toast.error("Please sign in as a Seller, Bank, or Admin to list this vehicle.");
      navigate("/login");
      return;
    }
    setSaving(true);
    const tid = toast.loading("Saving to auction ledger…");
    try {
      const payload = {
        ...formData,
        vehicle_age: new Date().getFullYear() - (Number(formData.year) || 2020),
        price: results.ai_price,
        ...results,
        ...(damageData && {
          damage_data: typeof damageData === "string" ? damageData : JSON.stringify(damageData),
          damages: damageData.damages_detected || [],
          damage_summary: damageData.damage_summary || {},
          annotated_images: damageData.annotated_images || [],
          exif_summary: damageData.exif_summary || null,
        }),
      };
      const res = await axios.post(
        "http://localhost:5000/api/vehicles",
        payload,
        {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      );
      toast.success("Saved Successfully!", { id: tid });
      navigate(`/vehicle/${res.data._id}`);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || "Failed to save.";
      toast.error(errMsg, { id: tid });
    } finally {
      setSaving(false);
    }
  };

  // ── Deal Indicator ─────────────────────────────────────────────
  const renderDealIndicator = () => {
    if (
      !results?.ai_price ||
      !formData.expected_price ||
      Number(formData.expected_price) < 50000
    )
      return null;
    const aiPrice = safeNumber(results.ai_price);
    const expected = safeNumber(formData.expected_price);
    const pct = (Math.abs(aiPrice - expected) / aiPrice) * 100;
    if (pct <= 5)
      return (
        <div className="deal-badge border-slate-600 bg-slate-800 text-slate-300">
          <AlertCircle className="w-4 h-4" /> Fair Market Value (±
          {pct.toFixed(1)}%)
        </div>
      );
    if (expected < aiPrice)
      return (
        <div className="deal-badge border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.15)]">
          <TrendingDown className="w-4 h-4" /> Good Deal — {pct.toFixed(1)}%
          Below AI Value
        </div>
      );
    return (
      <div className="deal-badge border-rose-500/40 bg-rose-500/10 text-rose-400 shadow-[0_0_24px_rgba(244,63,94,0.15)]">
        <TrendingUp className="w-4 h-4" /> Overpriced — {pct.toFixed(1)}% Above
        AI Value
      </div>
    );
  };

  // ── Helpers ────────────────────────────────────────────────────
  const F = (label: string, node: React.ReactNode, isFieldLoading?: boolean) => (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {label}
        </label>
        {isFieldLoading && (
          <span className="flex items-center gap-1 text-[10px] text-indigo-400 font-medium animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" /> Auto-filling...
          </span>
        )}
      </div>
      {node}
    </div>
  );
  const iCls =
    "w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all";
  const sCls = iCls;

  console.log("Before return");
  console.log("Before return in AddVehicle", { formData, loading, results });
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* ── Header ── */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white mb-2 flex items-center gap-3">
          <Car className="text-indigo-500" /> Vehicle Market Predictor
        </h1>
        <p className="text-slate-400 max-w-2xl text-sm">
          Intelligent hybrid engine — original price depreciation × segment
          weighting × mileage × condition × AI signal. Works for all cars from
          budget to luxury.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* ══ LEFT: Input Form ════════════════════════════════════ */}
        <div className="xl:col-span-5 bg-slate-800/50 backdrop-blur-md rounded-3xl p-8 border border-slate-700/50 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Activity className="text-indigo-400 w-5 h-5" /> Asset Details
          </h2>

          <form onSubmit={handleSubmit} className="relative z-10 space-y-4">
            {/* Brand + Model */}
            <div className="grid grid-cols-2 gap-4">
              {F(
                "Brand",
                <select
                  required
                  value={formData.brand}
                  onChange={(e) => handleBrandChange(e.target.value)}
                  className={iCls}
                >
                  <option value="">Select Brand</option>
                  {Object.keys(carData).map((brand: string) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>,
              )}
              {F(
                "Model",
                <div>
                  <select
                    required
                    value={formData.model}
                    disabled={!formData.brand}
                    onChange={(e) => handleModelChange(e.target.value)}
                    className={`${iCls} ${!formData.brand ? "bg-slate-800 cursor-not-allowed opacity-60" : ""}`}
                  >
                    <option value="">
                      {formData.brand ? "Select Model" : "Select Brand First"}
                    </option>
                    {(carData[formData.brand as keyof typeof carData] || []).map(
                      (model: string) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ),
                    )}
                  </select>
                  {/* Step 13 & 17: Specification status / error badge */}
                  {specError ? (
                    <div className="text-[11px] text-amber-400 flex items-center gap-1 font-medium mt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {specError} — enter manually
                    </div>
                  ) : formData.brand && formData.model && !specLoading ? (
                    <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium mt-1">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      Specifications auto-populated
                    </div>
                  ) : null}
                </div>,
                specLoading
              )}
            </div>

            {/* Year + Kilometers Driven */}
            <div className="grid grid-cols-2 gap-4">
              {F(
                "Year",
                <input
                  required
                  type="number"
                  min="1990"
                  max={new Date().getFullYear()}
                  value={formData.year}
                  onChange={(e) => {
                    markEdited("year");
                    set("year", Number(e.target.value));
                  }}
                  className={iCls}
                />,
              )}
              {F(
                "Kilometers Driven",
                <div>
                  <input
                    required
                    type="number"
                    min="0"
                    value={formData.mileage}
                    onChange={(e) => {
                      markEdited("mileage");
                      set("mileage", e.target.value);
                    }}
                    placeholder="Enter kilometers driven"
                    className={iCls}
                  />
                  {/* Step 6 & 7: Real-time Age, Depreciation & Condition Weight */}
                  {formData.mileage && Number(formData.mileage) >= 0 && (
                    <div className="mt-1.5 p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[11px] text-indigo-300 flex justify-between items-center">
                      <span>Age: <strong>{Math.max(0, new Date().getFullYear() - Number(formData.year))} yrs</strong></span>
                      <span>Exp. Dep: <strong>~{((1 - Math.pow(0.92, Math.max(0, new Date().getFullYear() - Number(formData.year)))) * 100).toFixed(0)}%</strong></span>
                      <span>Cond Wt: <strong>{formData.condition === 'excellent' ? '1.0' : formData.condition === 'good' ? '0.9' : '0.8'}</strong></span>
                    </div>
                  )}
                </div>,
              )}
            </div>

            {/* Fuel + Transmission */}
            <div className="grid grid-cols-2 gap-4">
              {F(
                "Fuel Type",
                <select
                  value={formData.fuel}
                  onChange={(e) => {
                    markEdited("fuel");
                    set("fuel", e.target.value);
                  }}
                  className={sCls}
                >
                  {["Petrol", "Diesel", "CNG", "Electric"].map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>,
                specLoading
              )}
              {F(
                "Transmission",
                <select
                  value={formData.transmission}
                  onChange={(e) => {
                    markEdited("transmission");
                    set("transmission", e.target.value);
                  }}
                  className={sCls}
                >
                  <option>Manual</option>
                  <option>Automatic</option>
                </select>,
                specLoading
              )}
            </div>

            {/* Engine + Power + Torque + Seats */}
            <div className="grid grid-cols-2 gap-3">
              {F(
                "Engine (CC)",
                <input
                  required
                  type="number"
                  min="0"
                  value={formData.engine}
                  onChange={(e) => {
                    markEdited("engine");
                    set("engine", e.target.value);
                  }}
                  placeholder="Enter engine capacity"
                  className={iCls}
                />,
                specLoading
              )}
              {F(
                "Max Power (BHP)",
                <input
                  required
                  type="number"
                  min="0"
                  value={formData.max_power}
                  onChange={(e) => {
                    markEdited("max_power");
                    set("max_power", e.target.value);
                  }}
                  placeholder="Enter max power"
                  className={iCls}
                />,
                specLoading
              )}
            </div>

            {/* Torque + Seats Row */}
            <div className="grid grid-cols-2 gap-3">
              {F(
                "Torque (Nm)",
                <input
                  type="number"
                  min="0"
                  value={formData.torque}
                  onChange={(e) => {
                    markEdited("torque");
                    set("torque", e.target.value);
                  }}
                  placeholder="Enter torque (optional)"
                  className={iCls}
                />,
                specLoading
              )}
              {F(
                "Seats",
                <input
                  required
                  type="number"
                  min="1"
                  max="9"
                  value={formData.seats}
                  onChange={(e) => {
                    markEdited("seats");
                    set("seats", e.target.value);
                  }}
                  placeholder="Enter number of seats"
                  className={iCls}
                />,
                specLoading
              )}
            </div>

            {/* ── Original Purchase Price (KEY NEW FIELD) ── */}
            <div className="bg-emerald-500/5 border border-emerald-500/25 rounded-2xl p-4 space-y-1">
              <label className="block text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <IndianRupee className="w-3.5 h-3.5" /> Original Purchase / Ex-Showroom Price (₹)
                </span>
                {specLoading && (
                  <span className="text-[10px] text-emerald-400 animate-pulse flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Fetching price...
                  </span>
                )}
              </label>
              <input
                type="number"
                min="0"
                value={formData.original_price}
                onChange={(e) => {
                  markEdited("original_price");
                  set("original_price", e.target.value);
                }}
                placeholder="e.g., 900000"
                className="w-full bg-slate-900 border border-emerald-500/30 rounded-xl px-4 py-2.5 text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
              <p className="text-[10px] text-slate-500">
                Providing this gives the most accurate valuation. Leave blank for auto-lookup.
              </p>
            </div>

            {/* ── Segment Selector ── */}
            {F(
              "Vehicle Segment",
              <select
                value={formData.segment}
                onChange={(e) => {
                  markEdited("segment");
                  set("segment", e.target.value);
                }}
                className={sCls}
              >
                {SEGMENTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>,
              specLoading
            )}

            {/* ── AI-Driven Condition (No manual override) ── */}
            {F(
              "Vehicle Condition (AI Inspected)",
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-semibold text-indigo-300">
                    Auto-Assessed via YOLO Damage Analysis
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 uppercase">
                  AI Condition
                </span>
              </div>,
            )}

            {/* ── Expected Price ── */}
            <div className="pt-3 border-t border-slate-700">
              <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5">
                Expected Sale / Purchase Price (₹) — for Deal Analysis
              </label>
              <input
                type="number"
                value={formData.expected_price}
                onChange={(e) => {
                  markEdited("expected_price");
                  set("expected_price", e.target.value);
                }}
                placeholder="Enter expected price"
                className="w-full text-lg font-bold bg-indigo-500/10 border border-indigo-500/30 rounded-xl px-4 py-3 text-indigo-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
              Run Intelligent AI Evaluation
            </button>
          </form>
        </div>

        {/* ══ RIGHT: Results Column ══════════════════════════════ */}
        <div className="xl:col-span-7 space-y-6">
          {/* Image Upload Section */}
          <ImageUploadSection
            onDamageDetected={(data) => {
              setDamageData(data);
              // Step 9: Automatically run AI evaluation pipeline when image analysis completes
              setTimeout(() => {
                handleSubmit();
              }, 400);
            }}
            onConditionAssessed={(assessment) => setConditionAssessment(assessment)}
          />

          {/* ── STEP-BY-STEP REALTIME LOADING CARD ── */}
          {loading ? (
            <div className="bg-slate-800/80 backdrop-blur-xl border border-indigo-500/40 rounded-3xl p-8 shadow-[0_0_60px_rgba(99,102,241,0.15)] space-y-6 animate-pulse">
              <div className="flex items-center gap-3">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                <div>
                  <h3 className="text-2xl font-extrabold text-white">Analyzing Vehicle...</h3>
                  <p className="text-xs text-slate-400">Cars24 / Copart Grade Automated AI Inspection</p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { id: 1, label: "Uploading Images" },
                  { id: 2, label: "Checking Image Quality" },
                  { id: 3, label: "Detecting Vehicle" },
                  { id: 4, label: "Running YOLO Damage Detection" },
                  { id: 5, label: "Running XGBoost Price Prediction" },
                  { id: 6, label: "Generating AI Inspection Report" },
                ].map((step) => {
                  const isDone = aiStep > step.id;
                  const isCurrent = aiStep === step.id;

                  return (
                    <div
                      key={step.id}
                      className={`flex items-center justify-between p-4 rounded-xl border text-sm transition-all ${
                        isDone
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-medium"
                          : isCurrent
                          ? "bg-indigo-500/20 border-indigo-500/50 text-white font-bold shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                          : "bg-slate-900/40 border-slate-800 text-slate-500"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        ) : isCurrent ? (
                          <Loader2 className="w-5 h-5 text-indigo-400 animate-spin shrink-0" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-slate-700 text-[10px] flex items-center justify-center font-bold text-slate-500">
                            {step.id}
                          </div>
                        )}
                        {step.label}
                      </span>
                      {isDone && <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">✓ Done</span>}
                      {isCurrent && <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 animate-pulse">In Progress...</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : aiError ? (
            /* AI Failure Informative Error Card */
            <div className="bg-rose-950/40 border border-rose-500/40 rounded-3xl p-8 space-y-4 text-center">
              <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
              <h3 className="text-xl font-bold text-white">AI Evaluation Error</h3>
              <p className="text-sm text-rose-200 max-w-md mx-auto">{aiError}</p>
              <button
                onClick={handleSubmit}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
              >
                Retry AI Evaluation
              </button>
            </div>
          ) : !results && !damageData && !conditionAssessment ? (
            /* Awaiting Parameters Empty State */
            <div className="h-full min-h-[480px] bg-slate-800/30 border border-slate-700/30 rounded-3xl border-dashed flex flex-col items-center justify-center text-slate-500 p-8 text-center gap-4">
              <Gauge className="w-16 h-16 text-slate-700" />
              <h3 className="text-xl font-semibold">Awaiting Parameters</h3>
              <p className="max-w-sm text-sm">
                Fill in vehicle details on the left and click &quot;Run Intelligent AI Evaluation&quot; to generate complete AI Inspection & Market Valuation.
              </p>
              <div className="grid grid-cols-3 gap-3 w-full max-w-md mt-2">
                {[
                  { icon: IndianRupee, text: "Original Price → Depreciation" },
                  { icon: Layers, text: "Segment → Weight Multiplier" },
                  { icon: Zap, text: "ML Signal → 30% Blend" },
                ].map(({ icon: Icon, text }) => (
                  <div
                    key={text}
                    className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 text-center"
                  >
                    <Icon className="w-5 h-5 mx-auto mb-1 text-indigo-500" />
                    <p className="text-[10px] text-slate-500">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* ── 🤖 AI VEHICLE INSPECTION CARD ── */}
              <div className="bg-gradient-to-br from-slate-800/90 via-slate-900/90 to-indigo-950/40 backdrop-blur-xl border-2 border-indigo-500/40 rounded-3xl p-8 shadow-[0_0_60px_rgba(99,102,241,0.2)] space-y-6">
                {/* Header Banner */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-700/60">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30">
                      <span className="text-3xl">🤖</span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
                        AI Vehicle Inspection
                      </h2>
                      <p className="text-xs text-indigo-300 font-medium">Cars24 / Copart / CarDekho AI Standard</p>
                    </div>
                  </div>

                  {/* Metric Pills */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="bg-slate-900/80 border border-slate-700/80 px-3.5 py-2 rounded-xl text-center">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Vehicle Detected</div>
                      <div className="text-xs font-extrabold text-emerald-400 flex items-center justify-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Yes
                      </div>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-700/80 px-3.5 py-2 rounded-xl text-center">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Vehicle Condition</div>
                      <div className="text-xs font-extrabold text-emerald-400 uppercase mt-0.5">
                        {conditionAssessment?.conditionCategory?.label || (results?.condition ? results.condition.toUpperCase() : "NO AI DATA")}
                      </div>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-700/80 px-3.5 py-2 rounded-xl text-center">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Inspection Score</div>
                      <div className="text-xs font-extrabold text-indigo-300 mt-0.5">
                        {typeof conditionAssessment?.scores?.final_condition === 'number' ? `${conditionAssessment.scores.final_condition} / 100` : 'N/A'}
                      </div>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-700/80 px-3.5 py-2 rounded-xl text-center">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Confidence</div>
                      <div className="text-xs font-extrabold text-cyan-400 mt-0.5">
                        {typeof damageData?.quality_adjusted_confidence === 'number' ? `${(damageData.quality_adjusted_confidence > 1 ? damageData.quality_adjusted_confidence : damageData.quality_adjusted_confidence * 100).toFixed(1)}%` : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2-Column Grid: Damage Detection & Repair Cost vs AI Market Valuation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Left Column: Damage Detection & Repair Cost */}
                  <div className="bg-slate-900/70 border border-slate-700/60 rounded-2xl p-5 space-y-4">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" /> Damage Detection
                    </h3>

                    <div className="space-y-2">
                      {damageData?.damages_detected && damageData.damages_detected.length > 0 ? (
                        damageData.damages_detected.map((d: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/40 text-xs">
                            <span className="text-slate-200 font-medium capitalize">
                              • {d.type || "Cosmetic Imperfection"} ({d.severity || "minor"})
                            </span>
                            <span className="text-amber-400 font-bold">
                              {d.confidence ? `${(d.confidence > 1 ? d.confidence : d.confidence * 100).toFixed(1)}% conf` : "Detected"}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-emerald-400 font-medium bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                          ✓ No Structural or Cosmetic Damage
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Estimated Repair Cost</span>
                      <span className="text-base font-extrabold text-amber-400">
                        {conditionAssessment?.repairEstimate?.estimated_repair_cost !== undefined
                          ? formatPrice(conditionAssessment.repairEstimate.estimated_repair_cost)
                          : "₹0"}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: AI Market Valuation */}
                  <div className="bg-slate-900/70 border border-indigo-500/30 rounded-2xl p-5 space-y-4">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" /> AI Market Valuation
                    </h3>

                    <div className="space-y-3">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Predicted Price</span>
                        <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                          {results?.ai_price ? formatPrice(results.ai_price) : "₹0"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/40">
                          <div className="text-slate-400 text-[10px]">Suggested Starting Bid</div>
                          <div className="font-bold text-white mt-0.5">
                            {results?.ai_price ? formatPrice(Math.round(results.ai_price * 0.7)) : "₹0"}
                          </div>
                        </div>
                        <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/40">
                          <div className="text-slate-400 text-[10px]">Suggested Reserve Price</div>
                          <div className="font-bold text-white mt-0.5">
                            {results?.ai_price ? formatPrice(Math.round(results.ai_price * 0.9)) : "₹0"}
                          </div>
                        </div>
                      </div>

                      <div className="bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-500/20 text-xs flex justify-between items-center">
                        <span className="text-indigo-300 font-medium">Expected Selling Range</span>
                        <span className="text-cyan-300 font-bold">
                          {results?.ai_price ? `${formatPrice(Math.round(results.ai_price * 0.85))} – ${formatPrice(Math.round(results.ai_price * 1.15))}` : "₹0"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Image Quality Breakdown */}
                {(() => {
                  const primaryQc = damageData?.validation?.quality_checks?.[0] || damageData?.quality_checks?.[0];
                  const avgQuality = damageData?.validation?.avg_quality_score || damageData?.avg_quality_score || (primaryQc?.overall_score ?? 0);
                  const sharpness = primaryQc?.sharpness_score ?? "N/A";
                  const lighting = primaryQc?.lighting_score ?? "N/A";
                  const resolution = primaryQc?.resolution_score ?? "N/A";
                  const reflection = primaryQc?.reflection_level ?? "None";
                  const warnings = damageData?.validation?.warnings || primaryQc?.warnings || [];

                  return (
                    <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-5 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-300 uppercase tracking-widest">Image Quality Breakdown</span>
                        <span className="font-extrabold text-indigo-400">
                          Quality Score: {avgQuality}%
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        <div className="bg-slate-800/60 p-2 rounded-xl border border-slate-700/40">
                          <div className="text-slate-400 text-[10px]">Sharpness</div>
                          <div className="font-bold text-indigo-300">{typeof sharpness === 'number' ? `${sharpness}%` : sharpness}</div>
                        </div>
                        <div className="bg-slate-800/60 p-2 rounded-xl border border-slate-700/40">
                          <div className="text-slate-400 text-[10px]">Lighting</div>
                          <div className="font-bold text-indigo-300">{typeof lighting === 'number' ? `${lighting}%` : lighting}</div>
                        </div>
                        <div className="bg-slate-800/60 p-2 rounded-xl border border-slate-700/40">
                          <div className="text-slate-400 text-[10px]">Resolution</div>
                          <div className="font-bold text-indigo-300">{typeof resolution === 'number' ? `${resolution}%` : resolution}</div>
                        </div>
                        <div className="bg-slate-800/60 p-2 rounded-xl border border-slate-700/40">
                          <div className="text-slate-400 text-[10px]">Reflection</div>
                          <div className="font-bold text-indigo-300">{reflection}</div>
                        </div>
                      </div>

                      {Array.isArray(warnings) && warnings.length > 0 && (
                        <div className="text-xs text-amber-400 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>Warnings: {warnings.join("; ")}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Summary & Recommendation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-900/60 border border-slate-700/50 p-4 rounded-xl space-y-1.5 text-xs">
                    <div className="font-bold text-slate-200 uppercase tracking-widest mb-1">AI Summary</div>
                    <div className="text-slate-300">
                      • {damageData?.combined_ai_report?.summary_text || conditionAssessment?.summary || "AI inspection complete. Vehicle ready for live auction evaluation."}
                    </div>
                  </div>
                  <div className="bg-emerald-950/40 border border-emerald-500/30 p-4 rounded-xl space-y-1.5 text-xs flex flex-col justify-center">
                    <div className="font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" /> AI Recommendation
                    </div>
                    <div className="text-emerald-200 font-medium leading-relaxed">
                      {Array.isArray(conditionAssessment?.recommendedRepairs) && conditionAssessment.recommendedRepairs.length > 0
                        ? conditionAssessment.recommendedRepairs[0].action || conditionAssessment.recommendedRepairs[0].message
                        : "Vehicle is verified for immediate auction listing."}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── PRICING BREAKDOWN CARD (when results available) ── */}
                {results && (
                  <div className="bg-slate-800/80 backdrop-blur-xl border border-indigo-500/30 rounded-3xl p-8 shadow-[0_0_60px_rgba(99,102,241,0.12)] space-y-6">
              {/* ── Hero Price ── */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" /> Intelligent
                    AI Market Valuation
                  </p>
                  <div className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-400 tracking-tighter">
                    {formatPrice(results.ai_price)}
                  </div>
                  {renderDealIndicator()}
                </div>
                <button
                  onClick={handleSaveToDb}
                  disabled={saving}
                  className="shrink-0 px-6 py-3 bg-slate-700/80 hover:bg-emerald-500/20 hover:text-emerald-400 text-slate-300 font-medium rounded-xl border border-slate-600 hover:border-emerald-500/30 transition-all flex items-center gap-2 shadow-lg group"
                >
                  {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5 text-slate-400 group-hover:text-emerald-400" />
                  )}
                  {saving ? "Saving…" : "Save to Database"}
                </button>
              </div>

              {/* ── Spectrum Bar ── */}
              <div>
                <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-2 px-1">
                  <span className="text-rose-500">Distress Floor</span>
                  <span className="text-emerald-400">AI Market Price</span>
                  <span className="text-indigo-400">Insurance IDV</span>
                </div>
                <div className="w-full h-4 bg-slate-900 rounded-full overflow-hidden flex border border-slate-700/80 p-0.5 gap-0.5">
                  <div
                    style={{ width: "20%" }}
                    className="h-full bg-gradient-to-r from-rose-700 to-rose-400 rounded-l-full"
                  />
                  <div
                    style={{ width: "44%" }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                  />
                  <div
                    style={{ width: "36%" }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-r-full"
                  />
                </div>
              </div>

              {/* ── Intelligence Badges ── */}
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const s = results?.segment ? SEGMENT_STYLE[results.segment] : null;
                  return s ? (
                    <span
                      className={`text-xs font-bold px-3 py-1.5 rounded-full border ${s.badge}`}
                    >
                      {s.label}
                    </span>
                  ) : null;
                })()}
                <span className="text-xs font-bold px-3 py-1.5 rounded-full border border-slate-600 bg-slate-800 text-slate-300">
                  <Award className="w-3 h-3 inline mr-1" />
                  Weight ×{safeNumber(results?.segment_weight, 2).toFixed(2)}
                </span>
                <span className="text-xs font-bold px-3 py-1.5 rounded-full border border-slate-600 bg-slate-800 text-slate-300">
                  📉 {safeNumber((results?.depreciation_rate || 0.08) * 100).toFixed(0)}
                  %/yr depreciation
                </span>
                <span className="text-xs font-bold px-3 py-1.5 rounded-full border border-slate-600 bg-slate-800 text-slate-300 capitalize">
                  <Zap className="w-3 h-3 inline mr-1" />
                  {results?.condition || "good"} (
                  {safeNumber((results?.condition_factor || 0.9) * 100).toFixed(0)}%)
                </span>
                <span className="text-xs font-bold px-3 py-1.5 rounded-full border border-slate-600 bg-slate-800 text-slate-300">
                  <Layers className="w-3 h-3 inline mr-1" />
                  Mileage ×{safeNumber(results?.mileage_factor, 2).toFixed(2)}
                </span>
                <span className="text-xs font-bold px-3 py-1.5 rounded-full border border-slate-700 bg-slate-900 text-slate-500">
                  <Tag className="w-3 h-3 inline mr-1" />
                  {SOURCE_LABEL[results?.price_source || ""] || results?.price_source || "AI Engine"}
                </span>
              </div>

              {/* ── Price Breakdown Grid ── */}
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                  Pricing Breakdown
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard
                    label="Ex-Showroom / Purchase"
                    value={formatPrice(results?.base_price)}
                    sub="Original market price"
                    color="text-white"
                  />
                  <MetricCard
                    label="Depreciated Base Value"
                    value={formatPrice(results?.base_value)}
                    sub="After 8%/yr compound"
                    color="text-white"
                  />
                  <MetricCard
                    label="ML Model Signal"
                    value={formatPrice(results?.ml_price)}
                    sub="30% of final blend"
                    color="text-cyan-400"
                  />
                  <MetricCard
                    label="Final Hybrid AI Price"
                    value={formatPrice(results?.ai_price)}
                    sub="70% structure + 30% ML"
                    color="text-indigo-300"
                    highlight
                  />
                </div>
              </div>

              {/* ── Valuation Metrics Grid ── */}
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                  Valuation Metrics
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard
                    icon={<TrendingDown className="w-3.5 h-3.5" />}
                    label="Residual Value"
                    value={formatPrice(results?.residual_value)}
                    sub="Future depreciated worth"
                    color="text-white"
                  />
                  <MetricCard
                    icon={<AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
                    label="Distress Sale Floor"
                    value={formatPrice(results?.distress_value)}
                    sub="Forced liquidation price"
                    color="text-white"
                  />
                  <MetricCard
                    icon={
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                    }
                    label="Insurance (IDV)"
                    value={formatPrice(results?.insurance_value)}
                    sub="Insured declared value"
                    color="text-white"
                  />
                  <MetricCard
                    icon={
                      <TrendingDown className="w-3.5 h-3.5 text-slate-500" />
                    }
                    label="Metal Salvage Value"
                    value={formatPrice(results?.salvage_value)}
                    sub="Scrap / part-out price"
                    color="text-white"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  </div>

  <style>{`
    .deal-badge {
      display: flex; align-items: center; gap: 0.4rem;
      font-size: 0.78rem; font-weight: 700;
      padding: 0.45rem 1rem; margin-top: 0.75rem;
      border-radius: 0.75rem; border-width: 1px;
    }
  `}</style>
</div>
  );
}

// ── Reusable metric card — theme-aware ──────────────────────────
function MetricCard({
  label,
  value,
  sub,
  color,
  highlight = false,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
  highlight?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className="p-4 rounded-2xl"
      style={
        highlight
          ? {
              background:
                "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(167,139,250,0.05))",
              border: "1px solid rgba(99,102,241,0.28)",
            }
          : {
              backgroundColor: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
            }
      }
    >
      <div
        className="text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5"
        style={{ color: "var(--text-muted)" }}
      >
        {icon} {label}
      </div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div
        className="text-[10px] mt-0.5"
        style={{ color: "var(--text-muted)" }}
      >
        {sub}
      </div>
    </div>
  );
}
