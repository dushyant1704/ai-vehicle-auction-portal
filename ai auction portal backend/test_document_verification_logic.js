/**
 * Unit Test Suite for Advanced Document Verification Engine
 */

const {
  verifyVehicleDocument,
  calculateContentHash,
  maskRegistrationPlate,
  maskVIN,
  maskName
} = require("./utils/documentVerificationEngine");

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
    failed++;
  }
}

console.log("═══════════════════════════════════════════════════════════");
console.log("🚀 TESTING DOCUMENT VERIFICATION ENGINE LOGIC");
console.log("═══════════════════════════════════════════════════════════\n");

// ── TEST 1: Valid RC Book with matching specs ─────────────────────
console.log("--- 1. Valid RC Book with Matching Specs ---");
const testVehicle = {
  _id: "veh_001",
  brand: "Maruti Suzuki",
  model: "Swift",
  year: 2022,
  location: "Mumbai, Maharashtra"
};

// VIN with 'N' in 10th position denotes year 2022: MALAA51FL N M123456
const validRC = {
  documentType: "rcBook",
  registrationNumber: "MH 02 AB 1234",
  chassisNumber: "MALAA51FLNM123456",
  engineNumber: "K12M1234567",
  ownerName: "Rahul Sharma",
  issueDate: "2022-04-15"
};

const res1 = verifyVehicleDocument(validRC, testVehicle, []);
assert(res1.trustScore >= 85, `High trust score on authentic RC (${res1.trustScore} >= 85)`);
assert(res1.autoRecommendation === "RECOMMENDED_APPROVE", "Auto recommendation is RECOMMENDED_APPROVE");
assert(res1.summary.criticalCount === 0, "Zero critical flags on valid RC");
assert(res1.extractedFields.maskedPlate === "MH 02 •••• 1234", "Registration plate masked cleanly");

// ── TEST 2: VIN Year Mismatch Detection ───────────────────────────
console.log("\n--- 2. VIN Year Mismatch Detection ---");
// VIN with 'K' in 10th position denotes year 2019, but vehicle listed as 2024
const mismatchRC = {
  documentType: "rcBook",
  registrationNumber: "MH 02 AB 1234",
  chassisNumber: "MALAA51FLKM123456", // 2019
  issueDate: "2019-03-01"
};
const vehicle2024 = { _id: "veh_002", year: 2024 };
const res2 = verifyVehicleDocument(mismatchRC, vehicle2024, []);
const vinYearCheck = res2.checks.find(c => c.ruleId === "VIN_YEAR_MATCH");
assert(vinYearCheck && !vinYearCheck.passed, "Detected VIN year mismatch (2019 VIN vs 2024 vehicle)");
assert(vinYearCheck.severity === "CRITICAL", "VIN year discrepancy marked as CRITICAL");
assert(res2.autoRecommendation === "FLAGGED_RISK", "Recommendation dropped to FLAGGED_RISK");

// ── TEST 3: Duplicate Document Hash (Cross-Listing Fraud) ─────────
console.log("\n--- 3. Duplicate Document Hash Detection ---");
const fileHash = calculateContentHash("sample_rc_file_content_binary_123");
const existingDocs = [
  { contentHash: fileHash, vehicleId: "veh_OTHER_999" }
];

const duplicateDoc = {
  documentType: "rcBook",
  registrationNumber: "DL 01 C 9999",
  chassisNumber: "MALAA51FLNM123456",
  contentHash: fileHash
};

const res3 = verifyVehicleDocument(duplicateDoc, testVehicle, existingDocs);
const dedupCheck = res3.checks.find(c => c.ruleId === "DOC_DEDUP_UNIQUE");
assert(dedupCheck && !dedupCheck.passed, "Duplicate document hash detected across different vehicle");
assert(dedupCheck.severity === "CRITICAL", "Duplicate asset hash flagged as CRITICAL");

// ── TEST 4: Institutional Bank Repossession Notice ───────────────
console.log("\n--- 4. Institutional Bank Repossession Notice ---");
const repoNotice = {
  documentType: "repossessionNotice",
  bankName: "HDFC Bank Asset Recovery",
  loanAccountNumber: "HDFC-AUTO-2022-9988",
  borrowerName: "Amitabh Verma",
  issueDate: "2024-01-10"
};

const res4 = verifyVehicleDocument(repoNotice, testVehicle, []);
const bankCheck = res4.checks.find(c => c.ruleId === "LENDER_ACCREDITATION");
assert(bankCheck && bankCheck.passed, "HDFC Bank recognized as accredited institutional lender");
assert(res4.trustScore >= 80, "Institutional notice scores high trust");

// ── TEST 5: Chronological Future Date Tampering ───────────────────
console.log("\n--- 5. Chronological Future Date Tampering ---");
const futureDoc = {
  documentType: "insurancePolicy",
  issueDate: "2029-12-31" // Future issue date
};
const res5 = verifyVehicleDocument(futureDoc, testVehicle, []);
const futureCheck = res5.checks.find(c => c.ruleId === "ISSUE_DATE_VALIDITY");
assert(futureCheck && !futureCheck.passed, "Future issuance date caught as tampering signal");

// ── TEST 6: Expired Document Audit ────────────────────────────────
console.log("\n--- 6. Expired Insurance Policy ---");
const expiredDoc = {
  documentType: "insurancePolicy",
  issueDate: "2021-01-01",
  expiryDate: "2022-01-01" // Expired
};
const res6 = verifyVehicleDocument(expiredDoc, testVehicle, []);
const expiryCheck = res6.checks.find(c => c.ruleId === "EXPIRATION_AUDIT");
assert(expiryCheck && !expiryCheck.passed, "Expired policy flagged with expiration notice");

// ── TEST 7: Privacy Masking Verification ──────────────────────────
console.log("\n--- 7. Privacy Masking Verification ---");
assert(maskRegistrationPlate("DL01AB1234") === "DL 01 •••• 1234", "Plate masked cleanly");
assert(maskVIN("MALAA51FLNM123456") === "MALAA51••••••3456", "VIN masked cleanly");
assert(maskName("Rahul Sharma") === "R•••• S•••••", "Owner name masked cleanly");

console.log("\n═══════════════════════════════════════════════════════════");
console.log(`🏁 ENGINE TEST COMPLETE: ${passed} PASSED, ${failed} FAILED`);
console.log("═══════════════════════════════════════════════════════════\n");

if (failed > 0) process.exit(1);
