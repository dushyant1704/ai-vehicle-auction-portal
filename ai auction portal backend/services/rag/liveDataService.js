/**
 * ═══════════════════════════════════════════════════════════════════
 * RAG LIVE AUTHORITATIVE DATA SERVICE
 * 
 * Fetches authoritative real-time database facts from MongoDB at
 * query time (live auction statuses, bids, vehicle valuations, user's
 * own history, and institutional inventory) to guarantee factual accuracy.
 * ═══════════════════════════════════════════════════════════════════
 */

const mongoose = require("mongoose");
const Vehicle = require("../../models/Vehicle");
const Auction = require("../../models/Auction");
const Bid = require("../../models/Bid");
const User = require("../../models/User");
const Document = require("../../models/Document");

/**
 * Format Indian Currency
 */
const fmt = (num) => {
  if (num === null || num === undefined || isNaN(Number(num))) return "N/A";
  return `₹${Number(num).toLocaleString("en-IN")}`;
};

/**
 * Format relative time
 */
const relTime = (date) => {
  if (!date) return "N/A";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

/**
 * Fetch live data tailored to the authenticated user and user query
 */
async function fetchLiveData(user, queryText = "") {
  const qLower = (queryText || "").toLowerCase();
  const role = (user?.role || "buyer").toLowerCase();
  const userId = user?.id || user?._id;

  const liveContext = {
    summary: "",
    records: [],
    sources: [],
    roleApplied: role,
  };

  try {
    // ═══════════════════════════════════════════════════════════════
    // 1. GENERAL BIDDER (Buyer) LIVE DATA
    // ═══════════════════════════════════════════════════════════════
    if (role === "buyer") {
      const parts = [];

      // A. If user asks about their own bids or history
      if (qLower.includes("my bid") || qLower.includes("my auction") || qLower.includes("history") || qLower.includes("status")) {
        const myBids = await Bid.find({ userId })
          .sort({ createdAt: -1 })
          .limit(8)
          .lean();

        if (myBids && myBids.length > 0) {
          parts.push(`### Your Personal Bidding History:\n${myBids.map((b) => 
            `- **${b.brand || ""} ${b.model || "Vehicle"}**: ${fmt(b.amount)} (${b.status || "active"}) placed ${relTime(b.createdAt)}`
          ).join("\n")}`);

          liveContext.sources.push({
            title: "Your Personal Bids (Live DB)",
            sourceType: "live_database",
            sourceId: `user_bids_${userId}`,
            snippet: `Found ${myBids.length} active/recent bids belonging to your user account.`,
            score: 1.0,
          });
        } else {
          parts.push(`You currently have no recorded bids placed in the system.`);
        }
      }

      // B. Fetch Currently Active / Live Auctions
      const liveAuctions = await Auction.find({
        status: { $in: ["Live", "active", "Scheduled", "upcoming"] },
      })
        .populate("vehicleId", "brand model year mileage damages condition damage_summary xgboost_base_price damage_adjusted_price final_valuation")
        .sort({ currentPrice: -1 })
        .limit(6)
        .lean();

      if (liveAuctions && liveAuctions.length > 0) {
        parts.push(`### Active Vehicle Auctions from Live Database:\n${liveAuctions.map((a) => {
          const v = a.vehicleId || {};
          const title = v.brand ? `${v.year || ""} ${v.brand} ${v.model}` : a.title || "Vehicle Auction";
          const dmgCount = v.damages?.length || v.damage_summary?.total_damages || 0;
          const dmgLevel = v.damage_summary?.severity_level || (dmgCount > 0 ? "detected" : "pristine");
          const endStr = a.endTime ? `Ends: ${new Date(a.endTime).toLocaleDateString("en-IN")}` : "Open";
          return `- **${title}** (Auction ID: ${a._id}) | Status: **${a.status}** | Current Bid: **${fmt(a.currentPrice || a.startPrice)}** | Start: ${fmt(a.startPrice)} | Damage: **${dmgCount} issues (${dmgLevel})** | ${endStr}`;
        }).join("\n")}`);

        liveContext.sources.push({
          title: "Currently Live Auctions",
          sourceType: "live_database",
          sourceId: "live_auctions",
          snippet: `Retrieved ${liveAuctions.length} live auction records directly from MongoDB.`,
          score: 1.0,
        });
      }

      // C. Specific vehicle search if mentioned in query
      const brandKeywords = ["bmw", "mercedes", "audi", "porsche", "toyota", "honda", "hyundai", "tata", "mahindra", "innova", "city", "creta", "m4", "911", "defender"];
      const mentionedBrands = brandKeywords.filter((b) => qLower.includes(b));

      if (mentionedBrands.length > 0) {
        const vehicles = await Vehicle.find({
          $or: [
            { brand: { $regex: mentionedBrands.join("|"), $options: "i" } },
            { model: { $regex: mentionedBrands.join("|"), $options: "i" } },
          ],
        })
          .limit(4)
          .lean();

        if (vehicles && vehicles.length > 0) {
          parts.push(`### Relevant Vehicle Inspection & Valuation Records:\n${vehicles.map((v) => {
            const damagesList = v.damages?.map((d) => `${d.type} (${d.severity || "minor"})`).join(", ") || "None detected";
            return `- **${v.year || ""} ${v.brand} ${v.model}**: Asking Price: **${fmt(v.price)}** | Final AI Valuation: **${fmt(v.final_valuation || v.price)}** | Detected Damages: **${damagesList}** | Condition: **${v.condition || "Good"}** (${v.conditionScore || 80}/100)`;
          }).join("\n")}`);

          liveContext.sources.push({
            title: `Matching Vehicles (${vehicles.length} records)`,
            sourceType: "live_database",
            sourceId: "vehicles_live_query",
            snippet: vehicles.map((v) => `${v.brand} ${v.model} - Valuation ${fmt(v.final_valuation || v.price)}`).join("; "),
            score: 0.95,
          });
        }
      }

      liveContext.summary = parts.join("\n\n");
      return liveContext;
    }

    // ═══════════════════════════════════════════════════════════════
    // 2. BANK / INSTITUTIONAL SELLER LIVE DATA
    // ═══════════════════════════════════════════════════════════════
    if (role === "seller" || role === "bank") {
      const parts = [];

      // A. The Seller's Own Vehicle Portfolio
      const myVehicles = await Vehicle.find({ sellerId: userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      // If user is a test bank user or has no vehicles registered to their ID yet,
      // fallback to showing institutional vehicles so the assistant can provide concrete valuation answers
      const institutionalVehicles = myVehicles.length > 0
        ? myVehicles
        : await Vehicle.find({ $or: [{ sellerId: userId }, { sellerId: null }] }).limit(6).lean();

      if (institutionalVehicles && institutionalVehicles.length > 0) {
        parts.push(`### Your Institution's Listed Vehicles & 4-Tier Valuations:\n${institutionalVehicles.map((v) => {
          const mlBase = fmt(v.xgboost_base_price || v.original_price || v.price);
          const dmgAdj = fmt(v.damage_adjusted_price || v.price * 0.9);
          const finalHyb = fmt(v.final_valuation || v.price);
          const damages = v.damages?.length || v.damage_summary?.total_damages || 0;
          return `- **${v.year || ""} ${v.brand} ${v.model}** (ID: ${v._id}):
    • 1. ML Baseline Price (XGBoost): ${mlBase}
    • 2. Damage-Adjusted Price: ${dmgAdj} (Damage Penalty: ${v.damage_penalty_percent || 0}%, Damages: ${damages})
    • 3. Final Hybrid Valuation (80/20 formula): **${finalHyb}**
    • 4. Current Listing/Asking Price: ${fmt(v.price)}`;
        }).join("\n\n")}`);

        liveContext.sources.push({
          title: "Institution Authorized Vehicles & 4-Tier Pricing",
          sourceType: "live_database",
          sourceId: `institution_vehicles_${userId}`,
          snippet: `Retrieved ${institutionalVehicles.length} authorized vehicle valuation records for your institution.`,
          score: 1.0,
        });
      }

      // B. Institution's Active Auctions & Bidding Summaries
      const instVehicleIds = institutionalVehicles.map((v) => v._id);
      const myAuctions = await Auction.find({
        $or: [{ sellerId: userId }, { vehicleId: { $in: instVehicleIds } }],
      })
        .limit(6)
        .lean();

      if (myAuctions && myAuctions.length > 0) {
        parts.push(`### Your Institution's Auction Status:\n${myAuctions.map((a) => {
          return `- **${a.title || "Vehicle Auction"}**: Status: **${a.status}** | Current Bid: **${fmt(a.currentPrice)}** | Reserve Price: **${fmt(a.reservePrice)}** (Reserve Met: ${a.reserveMet ? "YES" : "NO"})`;
        }).join("\n")}`);

        liveContext.sources.push({
          title: "Institution Auction Performance Summary",
          sourceType: "live_database",
          sourceId: `institution_auctions_${userId}`,
          snippet: `Found ${myAuctions.length} auctions matching your institution's inventory.`,
          score: 0.95,
        });
      }

      // C. Institutional Documents Uploaded by Institution
      const myDocs = await Document.find({ uploaderId: userId })
        .limit(5)
        .lean();

      if (myDocs && myDocs.length > 0) {
        parts.push(`### Uploaded Verification Documents:\n${myDocs.map((d) => 
          `- Document: **${d.documentType}** (${d.fileName || "file"}) | Status: **${d.status}** | Ref: ${d.documentReference || "N/A"}`
        ).join("\n")}`);

        liveContext.sources.push({
          title: "Institution Inspection & RC Documents",
          sourceType: "document",
          sourceId: `docs_${userId}`,
          snippet: `Found ${myDocs.length} compliance documents for your institution.`,
          score: 0.9,
        });
      }

      liveContext.summary = parts.join("\n\n");
      return liveContext;
    }

    // ═══════════════════════════════════════════════════════════════
    // 3. PLATFORM ADMINISTRATOR (Admin) LIVE DATA
    // ═══════════════════════════════════════════════════════════════
    if (role === "admin") {
      const parts = [];

      // A. Operational Metrics
      const totalUsers = await User.countDocuments();
      const totalVehicles = await Vehicle.countDocuments();
      const totalAuctions = await Auction.countDocuments();
      const liveAuctionsCount = await Auction.countDocuments({ status: { $in: ["Live", "active"] } });
      const pendingVerifications = await Vehicle.countDocuments({ verificationStatus: "pending" });
      const totalBidsCount = await Bid.countDocuments();

      parts.push(`### Platform Operational Summary:
- **Total Registered Users**: ${totalUsers}
- **Total Vehicles Cataloged**: ${totalVehicles}
- **Total Auctions Created**: ${totalAuctions} (Currently Live: **${liveAuctionsCount}**)
- **Total Bids Placed**: ${totalBidsCount}
- **Listings Awaiting Verification**: **${pendingVerifications}**`);

      liveContext.sources.push({
        title: "Platform-Wide Administrative Metrics",
        sourceType: "live_database",
        sourceId: "admin_platform_metrics",
        snippet: `Real-time platform metrics: ${totalUsers} users, ${totalVehicles} vehicles, ${liveAuctionsCount} live auctions.`,
        score: 1.0,
      });

      // B. Bidding Anomaly & Concentration Signals (For Human Review Only)
      const highBidAuctions = await Bid.aggregate([
        { $group: { _id: "$vehicleId", count: { $sum: 1 }, maxBid: { $max: "$amount" }, bidders: { $addToSet: "$userId" } } },
        { $sort: { count: -1 } },
        { $limit: 4 },
      ]);

      if (highBidAuctions && highBidAuctions.length > 0) {
        const vehicleIds = highBidAuctions.map((h) => h._id);
        const relatedVehicles = await Vehicle.find({ _id: { $in: vehicleIds } }).lean();
        const vMap = {};
        relatedVehicles.forEach((v) => { vMap[v._id.toString()] = `${v.brand} ${v.model}`; });

        parts.push(`### Bidding Activity & Potential Concentration Signals (For Human Review):
${highBidAuctions.map((h) => {
  const vName = vMap[h._id?.toString()] || "Vehicle";
  const concentration = h.bidders.length <= 2 && h.count >= 5 ? "⚠️ High Bid Concentration (few distinct bidders)" : "Normal competitive distribution";
  return `- **${vName}** (ID: ${h._id}): ${h.count} total bids placed | Highest: ${fmt(h.maxBid)} | Unique Bidders: ${h.bidders.length} | Status: ${concentration}`;
}).join("\n")}`);

        liveContext.sources.push({
          title: "Bidding Concentration Analysis",
          sourceType: "live_database",
          sourceId: "admin_bidding_signals",
          snippet: "Concentration heuristics computed across recent vehicle bids. Note: treated as signals for review, not proof of fraud.",
          score: 0.95,
        });
      }

      // C. Listings Awaiting Approval / Verification
      const pendingVehicles = await Vehicle.find({ verificationStatus: "pending" })
        .limit(5)
        .lean();

      if (pendingVehicles && pendingVehicles.length > 0) {
        parts.push(`### Vehicles Pending Verification Review:\n${pendingVehicles.map((v) => 
          `- **${v.year || ""} ${v.brand} ${v.model}** (ID: ${v._id}): Asking ${fmt(v.price)} | Final AI Valuation: ${fmt(v.final_valuation)} | Damage Severity: ${v.damage_summary?.severity_level || "pending"}`
        ).join("\n")}`);

        liveContext.sources.push({
          title: "Pending Vehicle Approval Queue",
          sourceType: "live_database",
          sourceId: "admin_pending_queue",
          snippet: `${pendingVehicles.length} vehicles currently pending administrative verification.`,
          score: 0.9,
        });
      }

      liveContext.summary = parts.join("\n\n");
      return liveContext;
    }

    return liveContext;
  } catch (err) {
    console.error("❌ [LiveDataService] Error fetching live database context:", err);
    return liveContext;
  }
}

module.exports = {
  fetchLiveData,
  fmt,
  relTime,
};
