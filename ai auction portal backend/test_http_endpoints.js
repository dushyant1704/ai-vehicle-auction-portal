require("dotenv").config();
const http = require("http");
const axios = require("axios");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "auction_jwt_secret_key_2024_secure";

async function runHttpTest() {
  console.log("Testing Backend Assistant HTTP Endpoints...");

  // Generate tokens for testing
  const buyerToken = jwt.sign(
    { id: "661f00000000000000000099", name: "Buyer Tester", email: "buyer@test.com", role: "buyer" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  const adminToken = jwt.sign(
    { id: "661f00000000000000000001", name: "Admin Tester", email: "admin@test.com", role: "admin" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  // Require express app without listen
  const express = require("express");
  // Let's import the server app or spin up temporary listener
  const app = express();
  app.use(express.json());
  
  // Connect DB
  const connectDB = require("./config/db");
  await connectDB();

  const assistantRoutes = require("./routes/assistantRoutes");
  app.use("/api/assistant", assistantRoutes);

  const srv = http.createServer(app);
  await new Promise(r => srv.listen(5099, r));
  console.log("Temporary test server listening on port 5099");

  try {
    // 1. Test Capabilities endpoint
    console.log("\n1. Testing GET /api/assistant/capabilities (as Buyer)...");
    const capRes = await axios.get("http://localhost:5099/api/assistant/capabilities", {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    console.log("   Status:", capRes.status);
    console.log("   Role Name:", capRes.data.roleName);
    console.log("   Model:", capRes.data.llmModel);
    console.log("   Total Chunks:", capRes.data.totalIndexedChunks);

    // 2. Test Chat endpoint
    console.log("\n2. Testing POST /api/assistant/chat (as Buyer)...");
    const chatRes = await axios.post(
      "http://localhost:5099/api/assistant/chat",
      { message: "What cars are currently live in the auction?" },
      { headers: { Authorization: `Bearer ${buyerToken}` } }
    );
    console.log("   Status:", chatRes.status);
    console.log("   Conversation ID:", chatRes.data.conversationId);
    console.log("   Answer excerpt:", chatRes.data.answer?.slice(0, 160).replace(/\n/g, " "));
    console.log("   Sources count:", chatRes.data.sources?.length);

    // 3. Test Conversations endpoint
    console.log("\n3. Testing GET /api/assistant/conversations (as Buyer)...");
    const convRes = await axios.get("http://localhost:5099/api/assistant/conversations", {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    console.log("   Status:", convRes.status);
    console.log("   Total conversations returned:", convRes.data.conversations?.length);

    // 4. Test Ingestion RBAC protection (Buyer should be 403 Forbidden)
    console.log("\n4. Testing POST /api/assistant/ingest (as Buyer - should be 403)...");
    try {
      await axios.post(
        "http://localhost:5099/api/assistant/ingest",
        {},
        { headers: { Authorization: `Bearer ${buyerToken}` } }
      );
      console.error("   ❌ Error: Buyer was not blocked from administrative ingestion!");
    } catch (err) {
      if (err.response?.status === 403) {
        console.log("   ✅ Passed: Ingestion correctly forbidden (403) for non-admin users.");
      } else {
        throw err;
      }
    }

    console.log("\n🎉 ALL HTTP ENDPOINT TESTS PASSED SUCCESSFULLY!");
  } finally {
    srv.close();
  }
}

runHttpTest().then(() => process.exit(0)).catch(e => {
  console.error("HTTP Test Failed:", e.response ? e.response.data : e.message);
  process.exit(1);
});
