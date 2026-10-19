/**
 * priceEstimator.ts
 * Realistic Indian-market resale price estimator.
 * Uses brand base prices, model multipliers, compound depreciation,
 * mileage adjustment and condition factor — no network call needed.
 */

const CURRENT_YEAR = new Date().getFullYear();

/* ── Approximate mid-trim ex-showroom price (INR) per brand ─────── */
const BRAND_BASE: Record<string, number> = {
  // Budget
  Maruti: 700_000, Suzuki: 700_000,
  Renault: 650_000, Nissan: 750_000,
  // Mid-Range
  Hyundai: 950_000, Tata: 850_000, Ford: 950_000,
  Honda: 1_100_000, Mahindra: 1_100_000,
  Kia: 1_150_000, MG: 1_200_000,
  BYD: 2_000_000,
  // Premium
  Toyota: 1_500_000, Skoda: 1_300_000,
  Volkswagen: 1_400_000, Jeep: 2_200_000,
  // Luxury
  Volvo: 4_500_000, BMW: 5_000_000,
  Mercedes: 5_500_000, Audi: 4_500_000,
  Jaguar: 7_000_000, LandRover: 9_000_000,
  // Exotic / Supercar
  Porsche: 9_000_000, Maserati: 18_000_000,
  AstonMartin: 28_000_000, Lamborghini: 35_000_000,
  Ferrari: 40_000_000, Bentley: 45_000_000,
  RollsRoyce: 55_000_000,
};

/* ── Model-specific price multiplier on top of brand base ─────────── */
const MODEL_MULT: Record<string, number> = {
  // Maruti
  Alto: 0.68, WagonR: 0.84, Swift: 0.95, Baleno: 1.05,
  Dzire: 1.00, Brezza: 1.18, Ertiga: 1.12, XL6: 1.25,
  Fronx: 1.15, 'Grand Vitara': 1.40,
  // Hyundai
  i10: 0.78, i20: 1.05, Verna: 1.25, Aura: 0.90,
  Venue: 1.12, Creta: 1.48, Alcazar: 1.62, Tucson: 2.05, Exter: 0.92,
  // Tata
  Tiago: 0.78, Tigor: 0.83, Altroz: 1.00, Punch: 0.95,
  Nexon: 1.22, Harrier: 1.50, Safari: 1.65,
  // Mahindra
  Bolero: 0.88, Scorpio: 1.08, 'Scorpio N': 1.52,
  Thar: 1.35, XUV300: 1.05, XUV700: 1.98,
  // Honda
  Amaze: 0.82, City: 1.32, Elevate: 1.26,
  // Toyota
  Glanza: 0.88, Hyryder: 1.30, 'Innova Crysta': 1.85,
  'Innova Hycross': 2.25, Fortuner: 2.65, Hilux: 2.42,
  // Kia
  Sonet: 1.06, Seltos: 1.38, Carens: 1.28, EV6: 3.55,
  // Renault / Nissan
  Kwid: 0.72, Triber: 0.95, Kiger: 0.90, Magnite: 0.92, 'X-Trail': 1.80,
  // MG
  'Comet EV': 0.75, Astor: 1.10, Hector: 1.30, 'ZS EV': 1.55, Gloster: 1.90,
  // Skoda / VW
  Slavia: 1.20, Kushaq: 1.16, Octavia: 1.62, Superb: 2.45,
  Virtus: 1.20, Taigun: 1.18, Tiguan: 1.82,
  // Jeep
  Compass: 1.00, Meridian: 1.30, Wrangler: 1.70,
  // BMW
  '2 Series': 0.88, '3 Series': 1.00, '5 Series': 1.42,
  '7 Series': 2.25, X1: 0.82, X3: 1.22, X5: 1.85, X7: 2.55,
  // Mercedes
  'A-Class': 0.83, 'C-Class': 1.00, 'E-Class': 1.52,
  'S-Class': 2.55, GLA: 0.88, GLC: 1.22, GLE: 1.82, GLS: 2.25,
  // Audi
  A4: 0.90, A6: 1.30, Q3: 0.88, Q5: 1.20, Q7: 1.75, Q8: 2.20,
  // Land Rover / Jaguar
  Defender: 1.10, Discovery: 1.20, 'Range Rover': 1.50,
  'Range Rover Sport': 1.30, 'Range Rover Velar': 1.15,
  XE: 0.85, XF: 1.00, 'F-Pace': 1.10, 'I-Pace': 1.20,
  // Exotics
  Huracan: 0.90, Aventador: 1.25, Urus: 1.10,
  Roma: 0.90, Portofino: 0.88, 'SF90 Stradale': 1.45, 'F8 Tributo': 1.10,
  '911': 1.05, Cayenne: 1.00, Macan: 0.82, Panamera: 1.12, Taycan: 1.20,
  DB11: 0.90, Vantage: 0.85, DBX: 1.00,
  'Continental GT': 0.92, Bentayga: 1.00, 'Flying Spur': 1.05,
  Phantom: 1.00, Ghost: 0.90, Cullinan: 1.10, Wraith: 0.80,
  Ghibli: 0.85, Levante: 1.00, Quattroporte: 1.05,
};

/* ── Condition factor ────────────────────────────────────────────── */
const CONDITION_FX: Record<string, number> = {
  excellent: 1.10,
  good: 1.00,
  average: 0.87,
  damaged: 0.62,
};

/**
 * Compute realistic Indian resale market price for a vehicle.
 */
export function estimateMarketPrice(vehicle: any): number {
  const brand     = vehicle?.brand    || '';
  const model     = vehicle?.model    || '';
  const year      = Number(vehicle?.year)    || 2020;
  const mileage   = Number(vehicle?.mileage) || 50_000;
  const condition = (vehicle?.condition as string)?.toLowerCase() || 'good';

  const basePrice = BRAND_BASE[brand] ?? 900_000;
  const modelMult = MODEL_MULT[model]  ?? 1.0;
  const newCost   = basePrice * modelMult;

  // Compound depreciation: 15% yr1, 10% yr2-5, 8% yr6+
  const age = Math.max(0, CURRENT_YEAR - year);
  let depreciatedValue = newCost;
  for (let i = 0; i < age; i++) {
    const rate = i === 0 ? 0.15 : i < 5 ? 0.10 : 0.08;
    depreciatedValue *= (1 - rate);
  }

  // Mileage adjustment (benchmark: 15,000 km/yr)
  const expectedKm   = Math.max(age * 15_000, 1);
  const mileageRatio = mileage / expectedKm;
  const mileageFx =
    mileageRatio <= 0.50 ? 1.06 :
    mileageRatio <= 1.00 ? 1.00 :
    mileageRatio <= 1.50 ? 0.93 :
    mileageRatio <= 2.00 ? 0.86 : 0.78;

  const conditionFx = CONDITION_FX[condition] ?? 1.0;

  // Round to nearest ₹1,000
  const estimate = Math.round(depreciatedValue * mileageFx * conditionFx / 1_000) * 1_000;
  return Math.max(estimate, 75_000);
}

/**
 * All derived valuation metrics from a single market price.
 */
export interface ValuationMetrics {
  marketPrice:    number;
  insuranceValue: number;
  baseValue:      number;
  residualValue:  number;
  distressValue:  number;
  salvageValue:   number;
  recommendedBid: number;
}

/**
 * Returns smart market price:
 * - Uses stored backend value when it looks vehicle-specific
 * - Falls back to formula when backend returns the uniform ₹800,000 default
 */
export function getSmartMarketPrice(vehicle: any): number {
  const stored = Number(vehicle?.marketPrice);
  if (stored && stored > 0 && stored !== 800_000) return stored;
  return estimateMarketPrice(vehicle);
}

/**
 * Full set of valuation metrics for a vehicle.
 * Backend values are preferred when available and non-uniform.
 */
export function computeValuationMetrics(vehicle: any): ValuationMetrics {
  const mp = getSmartMarketPrice(vehicle);
  return {
    marketPrice:    mp,
    insuranceValue: vehicle?.insuranceValue || Math.round(mp * 0.95),
    baseValue:      vehicle?.baseValue      || Math.round(mp * 1.22),
    residualValue:  vehicle?.residualValue  || Math.round(mp * 0.72),
    distressValue:  vehicle?.distressValue  || Math.round(mp * 0.70),
    salvageValue:   vehicle?.salvageValue   || Math.round(mp * 0.18),
    recommendedBid: Math.round(mp * 0.91),
  };
}
