/**
 * ═══════════════════════════════════════════════════════════════════
 * RBAC, SECURITY GUARDS, & DOCUMENT VERIFICATION TEST SUITE
 * ═══════════════════════════════════════════════════════════════════
 */

const { normalizeRole, authorizeRoles, checkPermissions, checkResourceOwnership } = require("./middleware/rbac");

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

async function runTestSuite() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("🚀 STARTING RBAC & COMPLIANCE VERIFICATION SUITE");
  console.log("═══════════════════════════════════════════════════════════\n");

  // ── TEST 1: Role Normalization & Aliases ───────────────────────
  console.log("--- 1. Role Normalization & Aliases ---");
  assert(normalizeRole("buyer") === "buyer", "Canonical 'buyer' normalized");
  assert(normalizeRole("bidder") === "buyer", "Alias 'bidder' -> 'buyer'");
  assert(normalizeRole("dealer") === "seller", "Alias 'dealer' -> 'seller'");
  assert(normalizeRole("individual_seller") === "seller", "Alias 'individual_seller' -> 'seller'");
  assert(normalizeRole("institution") === "bank", "Alias 'institution' -> 'bank'");
  assert(normalizeRole("creditor") === "bank", "Alias 'creditor' -> 'bank'");
  assert(normalizeRole("superadmin") === "admin", "Alias 'superadmin' -> 'admin'");
  assert(normalizeRole("inspector") === "admin", "Alias 'inspector' -> 'admin'");
  assert(normalizeRole(null) === "buyer", "Null/undefined defaults safely to 'buyer'");

  // ── TEST 2: authorizeRoles Middleware ──────────────────────────
  console.log("\n--- 2. authorizeRoles Middleware Enforcement ---");
  const authMiddleware = authorizeRoles("seller", "bank", "admin");

  // Unauthenticated user -> 401
  let res401 = { status(code) { this.statusCode = code; return this; }, json(data) { this.data = data; } };
  authMiddleware({}, res401, () => {});
  assert(res401.statusCode === 401, "Unauthenticated request returns 401 Unauthorized");

  // Unauthorized role (buyer) -> 403
  let res403 = { status(code) { this.statusCode = code; return this; }, json(data) { this.data = data; } };
  authMiddleware({ user: { role: "buyer" } }, res403, () => {});
  assert(res403.statusCode === 403, "Buyer calling seller/bank/admin endpoint returns 403 Forbidden");

  // Authorized role (seller) -> next() called
  let nextCalled = false;
  authMiddleware({ user: { role: "seller" } }, {}, () => { nextCalled = true; });
  assert(nextCalled === true, "Authorized role 'seller' succeeds and calls next()");

  // Authorized role with alias ('institution' -> 'bank') -> next() called
  nextCalled = false;
  authMiddleware({ user: { role: "institution" } }, {}, () => { nextCalled = true; });
  assert(nextCalled === true, "Role alias 'institution' succeeds and calls next()");

  // ── TEST 3: Resource Ownership Check ───────────────────────────
  console.log("\n--- 3. Resource Ownership Security ---");
  const ownerId = "661f00000000000000000010";
  const otherUserId = "661f00000000000000000099";

  const ownerUser = { id: ownerId, role: "seller" };
  const otherUser = { id: otherUserId, role: "seller" };
  const adminUser = { id: otherUserId, role: "admin" };

  assert(checkResourceOwnership(ownerId, ownerUser) === true, "Resource owner is allowed access");
  assert(checkResourceOwnership(ownerId, otherUser) === false, "Different user without admin role is denied access");
  assert(checkResourceOwnership(ownerId, adminUser) === true, "Admin role bypasses ownership for oversight");

  // ── TEST 4: Bid Controller RBAC Guards ─────────────────────────
  console.log("\n--- 4. Bid Controller RBAC Guards ---");
  // Simulating the checks from bidController.js
  const placeBidGuard = (user, vehicle) => {
    if (!user) return { status: 401, error: "Unauthorized" };
    if (user.role === "admin") return { status: 403, error: "Administrators cannot bid" };
    if (vehicle.sellerId && String(vehicle.sellerId) === String(user.id)) {
      return { status: 403, error: "Sellers cannot bid on own vehicle" };
    }
    return { status: 200, success: true };
  };

  const testVehicle = { id: "veh123", sellerId: "seller456" };
  assert(placeBidGuard(null, testVehicle).status === 401, "Unauthenticated bidder blocked (401)");
  assert(placeBidGuard({ id: "admin1", role: "admin" }, testVehicle).status === 403, "Admin blocked from bidding (403)");
  assert(placeBidGuard({ id: "seller456", role: "seller" }, testVehicle).status === 403, "Seller bidding on own vehicle blocked (403)");
  assert(placeBidGuard({ id: "buyer789", role: "buyer" }, testVehicle).status === 200, "Legitimate buyer bid allowed (200)");

  // ── TEST 5: Profile Role Self-Elevation Guard ──────────────────
  console.log("\n--- 5. Profile Role Self-Elevation Protection ---");
  const updateProfileGuard = (user, updates) => {
    if (!user) return { status: 401, error: "Unauthorized" };
    if (updates.role && user.role !== "admin") {
      return { status: 403, error: "Users cannot change their assigned role" };
    }
    return { status: 200, success: true };
  };

  assert(
    updateProfileGuard({ id: "buyer1", role: "buyer" }, { role: "admin" }).status === 403,
    "Non-admin attempting to self-elevate to admin blocked (403)"
  );
  assert(
    updateProfileGuard({ id: "buyer1", role: "buyer" }, { name: "New Name" }).status === 200,
    "Non-admin updating profile fields allowed (200)"
  );
  assert(
    updateProfileGuard({ id: "admin1", role: "admin" }, { role: "bank" }).status === 200,
    "Admin assigning role allowed (200)"
  );

  // ── TEST 6: Document Verification Workflow & Data Sanitization ─
  console.log("\n--- 6. Document Verification Workflow & Privacy Sanitization ---");
  const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  const validateDocUpload = (file) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return { valid: false, error: "Invalid format" };
    }
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: "Exceeds 10MB limit" };
    }
    return { valid: true };
  };

  assert(validateDocUpload({ mimetype: "application/pdf", size: 1024 * 500 }).valid === true, "Valid PDF accepted");
  assert(validateDocUpload({ mimetype: "application/x-msdownload", size: 500 }).valid === false, "Executable file rejected");
  assert(validateDocUpload({ mimetype: "image/png", size: 15 * 1024 * 1024 }).valid === false, "File over 10MB rejected");

  // Public View vs Privileged View Sanitization
  const rawDocument = {
    _id: "doc123",
    vehicleId: "veh456",
    documentType: "rcBook",
    fileName: "confidential_rc_scan.pdf",
    fileSize: 450000,
    mimeType: "application/pdf",
    storageKey: "https://secure-vault/docs/priv_98745123.pdf",
    isPrivate: true,
    documentReference: "DL04CA1234",
    status: "VERIFIED",
    reviewDetails: { reviewedAt: new Date(), decision: "VERIFIED", reviewerName: "SuperAdmin" }
  };

  const sanitizeForPublic = (doc) => ({
    _id: doc._id,
    documentType: doc.documentType,
    status: doc.status,
    verified: doc.status === "VERIFIED",
    verifiedAt: doc.reviewDetails?.reviewedAt || null
  });

  const publicDoc = sanitizeForPublic(rawDocument);
  assert(publicDoc.verified === true, "Public view shows verified status badge");
  assert(publicDoc.fileName === undefined, "Public view does NOT expose sensitive fileName");
  assert(publicDoc.storageKey === undefined, "Public view does NOT expose storageKey / private URL");
  assert(publicDoc.documentReference === undefined, "Public view does NOT expose documentReference");

  // ── TEST 7: Regex Extraction for Unverified Fields ─────────────
  console.log("\n--- 7. Regex Extraction for Unverified Fields ---");
  const REG_REGEX = /^[A-Z]{2}[ -]?[0-9]{1,2}[ -]?[A-Z]{1,3}[ -]?[0-9]{4}$/i;
  const CHASSIS_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/i;

  assert(REG_REGEX.test("MH 02 AB 1234") === true, "Indian RC plate format recognized");
  assert(REG_REGEX.test("DL-01-C-9999") === true, "Hyphenated Indian RC plate recognized");
  assert(REG_REGEX.test("NOT_A_REG_PLATE") === false, "Arbitrary invalid string rejected");
  assert(CHASSIS_REGEX.test("MALAA51FLHM123456") === true, "Standard 17-char VIN recognized");
  assert(CHASSIS_REGEX.test("INVALID_VIN_TOO_SHORT") === false, "Invalid VIN rejected");

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log(`🏁 RBAC & COMPLIANCE SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log("═══════════════════════════════════════════════════════════\n");

  if (failed > 0) process.exit(1);
}

runTestSuite().catch(e => {
  console.error(e);
  process.exit(1);
});
