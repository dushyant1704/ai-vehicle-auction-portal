/**
 * ═══════════════════════════════════════════════════════════════════
 * AI AUCTION PORTAL — ADVANCED DOCUMENT VERIFICATION ENGINE
 * 
 * Provides automated integrity validation, Indian RTO format checks,
 * VIN/Chassis decoding, cross-specification consistency audit,
 * tamper/duplicate detection, and privacy-preserving field masking.
 * ═══════════════════════════════════════════════════════════════════
 */

const crypto = require("crypto");

// ── REGEX PATTERNS ────────────────────────────────────────────────
// Standard Indian RTO Plate (e.g., MH02AB1234, DL-01-C-9999) & BH Series (e.g., 22BH1234AA)
const REGISTRATION_PLATE_REGEX =
  /^(([A-Z]{2}[ -]?[0-9]{1,2}[ -]?[A-Z]{0,3}[ -]?[0-9]{4})|([0-9]{2}[ -]?BH[ -]?[0-9]{4}[ -]?[A-Z]{1,2}))$/i;

// 17-character ISO 3779 VIN / Chassis (No I, O, Q allowed)
const VIN_CHASSIS_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/i;

// Standard Engine Number (typically 6-14 alphanumeric chars)
const ENGINE_REGEX = /^[A-Z0-9]{6,16}$/i;

// ISO Year Codes for 10th character of 17-character VIN
const VIN_YEAR_MAP = {
  Y: 2000, 1: 2001, 2: 2002, 3: 2003, 4: 2004, 5: 2005, 6: 2006, 7: 2007,
  8: 2008, 9: 2009, A: 2010, B: 2011, C: 2012, D: 2013, E: 2014, F: 2015,
  G: 2016, H: 2017, J: 2018, K: 2019, L: 2020, M: 2021, N: 2022, P: 2023,
  R: 2024, S: 2025, T: 2026, V: 2027, W: 2028, X: 2029
};

// Known Indian Institutional Lenders & Asset Recovery Banks
const RECOGNIZED_LENDERS = [
  "STATE BANK OF INDIA", "SBI", "HDFC BANK", "HDFC", "ICICI BANK", "ICICI",
  "AXIS BANK", "KOTAK MAHINDRA BANK", "KOTAK", "PUNJAB NATIONAL BANK", "PNB",
  "BANK OF BARODA", "BOB", "CANARA BANK", "UNION BANK", "INDUSIND BANK",
  "IDFC FIRST BANK", "YES BANK", "TATA CAPITAL", "MAHINDRA FINANCE",
  "BAJAJ FINANCE", "CHOLAMANDALAM", "SHRIRAM FINANCE", "SUNDARAM FINANCE",
  "HERO FINCORP", "L&T FINANCE", "AU SMALL FINANCE BANK", "MUTHOOT CAPITAL"
];

// ── UTILITY HELPERS ───────────────────────────────────────────────
function calculateContentHash(bufferOrString) {
  if (!bufferOrString) return null;
  return crypto.createHash("sha256").update(bufferOrString).digest("hex");
}

function cleanString(str) {
  if (!str || typeof str !== "string") return "";
  return str.trim();
}

/**
 * Mask string for public view (e.g. DL01AB1234 -> DL 01 •••• 1234)
 */
function maskRegistrationPlate(plate) {
  if (!plate || typeof plate !== "string") return "DL •• •••• ••••";
  const cleaned = plate.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  if (cleaned.length < 8) return cleaned.slice(0, 2) + " •••• " + cleaned.slice(-2);
  const state = cleaned.slice(0, 2);
  const rto = cleaned.slice(2, 4);
  const lastFour = cleaned.slice(-4);
  return `${state} ${rto} •••• ${lastFour}`;
}

/**
 * Mask 17-char VIN for public view (e.g., MALAA51••••••3456)
 */
function maskVIN(vin) {
  if (!vin || typeof vin !== "string") return "•••••••••••••••••";
  const cleaned = vin.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  if (cleaned.length !== 17) return "•••• •••• •••• ••••";
  return cleaned.slice(0, 7) + "••••••" + cleaned.slice(13);
}

/**
 * Mask personal name (e.g., "Rahul Sharma" -> "R•••• S•••••")
 */
function maskName(name) {
  if (!name || typeof name !== "string") return "Certified Owner";
  return name
    .trim()
    .split(/\s+/)
    .map((part) => (part.length <= 1 ? part : part[0] + "•".repeat(Math.min(part.length - 1, 5))))
    .join(" ");
}

// ── CORE VERIFICATION ENGINE ──────────────────────────────────────
/**
 * Executes comprehensive validation of an uploaded vehicle compliance document.
 * 
 * @param {Object} docPayload - Uploaded document metadata and extracted input fields
 * @param {Object} vehicle - Vehicle mongoose model or plain object
 * @param {Array} existingDocs - Other documents currently associated with the platform
 * @returns {Object} verificationResult
 */
function verifyVehicleDocument(docPayload = {}, vehicle = {}, existingDocs = []) {
  const {
    documentType = "other",
    registrationNumber,
    chassisNumber,
    engineNumber,
    ownerName,
    bankName,
    loanAccountNumber,
    issueDate,
    expiryDate,
    contentHash,
    documentReference
  } = docPayload;

  const checks = [];
  let score = 100;

  const addCheck = (ruleId, name, passed, penalty, message, severity = "WARNING") => {
    checks.push({
      ruleId,
      name,
      passed,
      penalty: passed ? 0 : penalty,
      message,
      severity: passed ? "INFO" : severity
    });
    if (!passed) {
      score = Math.max(0, score - penalty);
    }
  };

  // ── 1. DEDUPLICATION / FRAUD REUSE CHECK ────────────────────────
  if (contentHash && Array.isArray(existingDocs)) {
    const duplicateDoc = existingDocs.find(
      (d) =>
        d.contentHash &&
        d.contentHash === contentHash &&
        String(d.vehicleId) !== String(vehicle._id || vehicle.id)
    );

    if (duplicateDoc) {
      addCheck(
        "DOC_DEDUP_UNIQUE",
        "Unique Document Hash Integrity",
        false,
        45,
        "CRITICAL ALERT: This exact file hash is already registered to a different vehicle listing. Potential duplicate/forged asset document.",
        "CRITICAL"
      );
    } else {
      addCheck(
        "DOC_DEDUP_UNIQUE",
        "Unique Document Hash Integrity",
        true,
        0,
        "Document hash is unique and not associated with any conflicting vehicle listing."
      );
    }
  }

  // ── 2. REGISTRATION PLATE VALIDATION & CROSS-MATCH ─────────────
  const regCandidate = cleanString(registrationNumber || documentReference);
  if (regCandidate) {
    const isValidFormat = REGISTRATION_PLATE_REGEX.test(regCandidate);
    if (!isValidFormat) {
      addCheck(
        "REG_PLATE_FORMAT",
        "Registration Plate Format Standard",
        false,
        20,
        `Plate '${regCandidate}' does not match standard Indian RTO or BH-series syntax.`,
        "WARNING"
      );
    } else {
      addCheck(
        "REG_PLATE_FORMAT",
        "Registration Plate Format Standard",
        true,
        0,
        `Plate '${regCandidate}' conforms to official MoRTH RTO registration format.`
      );

      // Cross-match with vehicle registration location if present
      if (vehicle.ownershipHistory?.registrationCity || vehicle.location) {
        const stateCode = regCandidate.slice(0, 2).toUpperCase();
        // Indian State codes dictionary (sampling key states)
        const STATE_MAP = {
          MH: ["mumbai", "pune", "nagpur", "thane", "nashik", "maharashtra"],
          DL: ["delhi", "new delhi", "ncr"],
          KA: ["bangalore", "bengaluru", "mysore", "karnataka"],
          TN: ["chennai", "coimbatore", "madurai", "tamil nadu"],
          GJ: ["ahmedabad", "surat", "vadodara", "gujarat"],
          HR: ["gurugram", "gurgaon", "faridabad", "haryana"],
          UP: ["noida", "lucknow", "kanpur", "ghaziabad", "uttar pradesh"],
          TS: ["hyderabad", "telangana"],
          WB: ["kolkata", "west bengal"]
        };

        const loc = (vehicle.location || vehicle.ownershipHistory?.registrationCity || "").toLowerCase();
        const expectedKeywords = STATE_MAP[stateCode] || [];
        const isLocConsistent = expectedKeywords.some((kw) => loc.includes(kw));

        if (expectedKeywords.length > 0 && !isLocConsistent && loc.length > 2) {
          addCheck(
            "REG_LOCATION_CONSISTENCY",
            "RTO State & Location Coherence",
            true, // Non-fatal advisory, vehicles can be relocated interstate
            0,
            `Notice: RTO state code '${stateCode}' registered while vehicle is listed in '${vehicle.location}'. Interstate transfer noted.`,
            "INFO"
          );
        }
      }
    }
  } else if (documentType === "rcBook") {
    addCheck(
      "REG_PLATE_PRESENT",
      "Registration Number Mandatory for RC",
      false,
      25,
      "RC Book upload requires registration plate number.",
      "CRITICAL"
    );
  }

  // ── 3. CHASSIS NUMBER (VIN) & YEAR DECODING AUDIT ──────────────
  const vinCandidate = cleanString(chassisNumber);
  if (vinCandidate) {
    const isCleanVIN = VIN_CHASSIS_REGEX.test(vinCandidate);
    if (!isCleanVIN) {
      addCheck(
        "VIN_CHASSIS_SYNTAX",
        "17-Digit ISO 3779 VIN Structure",
        false,
        25,
        "VIN must be strictly 17 alphanumeric characters (excluding confusing letters I, O, Q).",
        "CRITICAL"
      );
    } else {
      addCheck(
        "VIN_CHASSIS_SYNTAX",
        "17-Digit ISO 3779 VIN Structure",
        true,
        0,
        "Chassis number adheres to ISO 3779 global standard."
      );

      // Decode manufacturing year from 10th character
      const yearChar = vinCandidate[9].toUpperCase();
      const decodedYear = VIN_YEAR_MAP[yearChar];

      if (decodedYear && vehicle.year) {
        const yearDiff = Math.abs(decodedYear - vehicle.year);
        if (yearDiff > 1) {
          addCheck(
            "VIN_YEAR_MATCH",
            "VIN Year vs Listing Year Consistency",
            false,
            30,
            `Discrepancy: VIN 10th character '${yearChar}' denotes model year ${decodedYear}, but vehicle is listed as year ${vehicle.year}.`,
            "CRITICAL"
          );
        } else {
          addCheck(
            "VIN_YEAR_MATCH",
            "VIN Year vs Listing Year Consistency",
            true,
            0,
            `VIN decoded manufacturing year (${decodedYear}) matches vehicle model year (${vehicle.year}).`
          );
        }
      }
    }
  } else if (documentType === "rcBook") {
    addCheck(
      "VIN_CHASSIS_PRESENT",
      "Chassis / VIN Number Verification",
      false,
      20,
      "Chassis/VIN number was not provided for registration certificate review.",
      "WARNING"
    );
  }

  // ── 4. ENGINE NUMBER VALIDATION ────────────────────────────────
  const engineCandidate = cleanString(engineNumber);
  if (engineCandidate) {
    if (ENGINE_REGEX.test(engineCandidate)) {
      addCheck(
        "ENGINE_SYNTAX",
        "Engine Number Specification",
        true,
        0,
        `Engine number '${engineCandidate}' conforms to manufacturer standards.`
      );
    } else {
      addCheck(
        "ENGINE_SYNTAX",
        "Engine Number Specification",
        false,
        10,
        "Engine number contains invalid characters or abnormal length.",
        "WARNING"
      );
    }
  }

  // ── 5. INSTITUTIONAL LENDER & REPOSSESSION NOTICE AUDIT ─────────
  if (documentType === "repossessionNotice" || documentType === "form35Noc") {
    const lenderCandidate = cleanString(bankName).toUpperCase();
    if (lenderCandidate) {
      const isRecognized = RECOGNIZED_LENDERS.some(
        (bank) => lenderCandidate.includes(bank) || bank.includes(lenderCandidate)
      );

      if (isRecognized) {
        addCheck(
          "LENDER_ACCREDITATION",
          "Institutional Authority Verification",
          true,
          0,
          `Financier / Bank '${bankName}' is recognized in the national banking and recovery network.`
        );
      } else {
        addCheck(
          "LENDER_ACCREDITATION",
          "Institutional Authority Verification",
          true,
          0,
          `Financier '${bankName}' noted. Requires inspector validation for authorized recovery status.`,
          "INFO"
        );
      }
    } else {
      addCheck(
        "LENDER_SPECIFIED",
        "Financier / Bank Name Specified",
        false,
        20,
        "Repossession Notice / NOC requires specifying the issuing financial institution.",
        "WARNING"
      );
    }

    if (loanAccountNumber) {
      addCheck(
        "LOAN_REF_PRESENT",
        "Loan Account Reference Audit",
        true,
        0,
        "Loan account reference linked with repossession filing."
      );
    }
  }

  // ── 6. TEMPORAL DATES & EXPIRATION AUDIT ───────────────────────
  const now = new Date();
  if (issueDate) {
    const parsedIssue = new Date(issueDate);
    if (!isNaN(parsedIssue.getTime())) {
      if (parsedIssue > now) {
        addCheck(
          "ISSUE_DATE_VALIDITY",
          "Chronological Issuance Date",
          false,
          30,
          "Document issuance date is in the future. Potential clock or date forgery.",
          "CRITICAL"
        );
      } else {
        addCheck(
          "ISSUE_DATE_VALIDITY",
          "Chronological Issuance Date",
          true,
          0,
          `Document was officially issued on ${parsedIssue.toISOString().split("T")[0]}.`
        );
      }
    }
  }

  if (expiryDate) {
    const parsedExpiry = new Date(expiryDate);
    if (!isNaN(parsedExpiry.getTime())) {
      if (parsedExpiry < now) {
        const daysExpired = Math.round((now - parsedExpiry) / (1000 * 60 * 60 * 24));
        addCheck(
          "EXPIRATION_AUDIT",
          "Document Active Validity Period",
          false,
          20,
          `Document expired ${daysExpired} days ago on ${parsedExpiry.toISOString().split("T")[0]}. Renewal required.`,
          "WARNING"
        );
      } else {
        const daysRemaining = Math.round((parsedExpiry - now) / (1000 * 60 * 60 * 24));
        addCheck(
          "EXPIRATION_AUDIT",
          "Document Active Validity Period",
          true,
          0,
          `Document is currently valid for the next ${daysRemaining} days (expires ${parsedExpiry.toISOString().split("T")[0]}).`
        );
      }
    }
  }

  // ── 7. FINAL TRUST SCORE & AUTO-VERDICT COMPUTATION ─────────────
  const hasCritical = checks.some((c) => c.severity === "CRITICAL" && !c.passed);
  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  let autoRecommendation = "MANUAL_REVIEW_REQUIRED";
  let suggestedStatus = "PENDING";
  let verdictMessage = "Document queued for manual administrative review.";

  if (hasCritical || finalScore < 50) {
    autoRecommendation = "FLAGGED_RISK";
    suggestedStatus = "PENDING";
    verdictMessage = "Document contains severe inconsistencies or fraud indicators. Flagged for compliance review.";
  } else if (finalScore >= 85) {
    autoRecommendation = "RECOMMENDED_APPROVE";
    verdictMessage = "Document passed automated specification and RTO format verification with high confidence.";
  } else {
    autoRecommendation = "MANUAL_REVIEW_REQUIRED";
    verdictMessage = "Document partially verified; inspector review required for minor advisories.";
  }

  // Sanitized extracted fields
  const extractedFields = {
    registrationNumber: regCandidate ? regCandidate.toUpperCase() : null,
    chassisNumber: vinCandidate ? vinCandidate.toUpperCase() : null,
    engineNumber: engineCandidate ? engineCandidate.toUpperCase() : null,
    ownerName: cleanString(ownerName),
    bankName: cleanString(bankName),
    loanAccountNumber: cleanString(loanAccountNumber),
    issueDate: issueDate || null,
    expiryDate: expiryDate || null,
    maskedPlate: maskRegistrationPlate(regCandidate),
    maskedVIN: maskVIN(vinCandidate),
    maskedOwner: maskName(ownerName)
  };

  return {
    trustScore: finalScore,
    autoRecommendation,
    suggestedStatus,
    verdictMessage,
    checks,
    extractedFields,
    summary: {
      totalChecks: checks.length,
      passedChecks: checks.filter((c) => c.passed).length,
      warningCount: checks.filter((c) => !c.passed && c.severity === "WARNING").length,
      criticalCount: checks.filter((c) => !c.passed && c.severity === "CRITICAL").length
    }
  };
}

module.exports = {
  verifyVehicleDocument,
  calculateContentHash,
  maskRegistrationPlate,
  maskVIN,
  maskName,
  REGISTRATION_PLATE_REGEX,
  VIN_CHASSIS_REGEX,
  RECOGNIZED_LENDERS
};
