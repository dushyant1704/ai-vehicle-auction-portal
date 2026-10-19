const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const router = express.Router();

const Vehicle = require("../models/Vehicle");
const { calculateVehiclePricing, calculateSimpleValuation } = require("../utils/unifiedPricingEngine");
const { sanitizeMileage } = require("../utils/dataPreprocessor");
const upload = require("../middleware/upload");
const vehicleController = require("../controllers/vehicleController");
const { verifyToken } = require("../middleware/auth");
const { authorizeRoles, checkResourceOwnership, normalizeRole } = require("../middleware/rbac");

router.get("/stats", vehicleController.getPlatformStats);
router.get("/specifications", vehicleController.getVehicleSpecifications);

// Helper function to compute ML prediction for a vehicle
async function getMlPrediction(vehicle) {
  const ML_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:5001";
  try {
    const mlResponse = await axios.post(
      `${ML_URL}/predict`,
      {
        brand: vehicle.brand,
        model: vehicle.model,
        vehicle_age: vehicle.vehicle_age,
        fuel: vehicle.fuel,
        transmission: vehicle.transmission,
        engine: vehicle.engine,
        max_power: vehicle.max_power,
        seats: vehicle.seats,
      },
      { timeout: 5000 }
    );
    return mlResponse.data.predicted_price || 800000;
  } catch (err) {
    console.warn("ML prediction unavailable:", err.message);
    return 800000;
  }
}

// ✅ CREATE vehicle WITH FILE UPLOAD — RBAC: seller, bank, or admin only
router.post("/", verifyToken, authorizeRoles("seller", "bank", "admin"), upload.array("files", 5), async (req, res) => {
  try {
    const files = req.files || [];

    let imageUrls = [];
    const videoUrls = [];

    // Parse existing images array or string if passed in JSON body
    if (Array.isArray(req.body.images)) {
      imageUrls = [...req.body.images];
    } else if (typeof req.body.images === "string" && req.body.images.trim()) {
      try {
        const parsed = JSON.parse(req.body.images);
        if (Array.isArray(parsed)) imageUrls = parsed;
        else imageUrls = [req.body.images];
      } catch {
        imageUrls = [req.body.images];
      }
    }

    files.forEach((file) => {
      if (file.mimetype.startsWith("image")) {
        imageUrls.push(file.path);
      } else if (file.mimetype.startsWith("video")) {
        videoUrls.push(file.path);
      }
    });

    // Extract seller ID from authenticated user (admin may assign sellerId, others must use own ID)
    const userRole = normalizeRole(req.user.role);
    const sellerId = (userRole === "admin" && req.body.sellerId) ? req.body.sellerId : req.user.id;

    // Disallow non-admin users from self-verifying vehicles on creation
    const requestedVerificationStatus = userRole === "admin" && req.body.verificationStatus
      ? req.body.verificationStatus
      : "pending";

    const vehicleData = {
      ...req.body,
      images: imageUrls,
      videos: videoUrls,
      sellerId,
      verificationStatus: requestedVerificationStatus,
      governanceStatus: userRole === "admin" && req.body.governanceStatus ? req.body.governanceStatus : "PENDING_INSPECTION"
    };

    const vehicle = await Vehicle.create(vehicleData);

    res.status(201).json(vehicle);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ GET vehicles (with Search, Filtering, and Pagination)
router.get("/", async (req, res) => {
  try {
    const {
      limit = 20,
      page = 1,
      search = "",
      brand,
      fuel,
      transmission,
      year,
      minMileage,
      maxMileage,
      minPrice,
      maxPrice,
      sellerId,
      sortBy,
    } = req.query;

    const query = {};

    // 1. Search Query (Brand or Model)
    if (search) {
      query.$or = [
        { brand: { $regex: search, $options: "i" } },
        { model: { $regex: search, $options: "i" } },
      ];
    }

    if (brand) query.brand = { $regex: brand, $options: "i" };
    if (fuel) query.fuel = { $regex: fuel, $options: "i" };
    if (transmission) query.transmission = { $regex: transmission, $options: "i" };
    if (sellerId) query.sellerId = sellerId;

    // 2. Year Filter
    if (year) {
      if (year === "older") {
        query.year = { $lte: 2017 };
      } else {
        query.year = parseInt(year, 10);
      }
    }

    // 3. Mileage & Price Filter
    if (minMileage !== undefined || maxMileage !== undefined) {
      query.mileage = {};
      if (minMileage) query.mileage.$gte = parseInt(minMileage, 10);
      if (maxMileage) query.mileage.$lte = parseInt(maxMileage, 10);
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice) query.price.$gte = parseInt(minPrice, 10);
      if (maxPrice) query.price.$lte = parseInt(maxPrice, 10);
    }

    // 4. Sorting logic
    let sortOptions = { _id: -1 }; // default latest
    if (sortBy === "year-desc") sortOptions = { year: -1 };
    if (sortBy === "year-asc") sortOptions = { year: 1 };
    if (sortBy === "mileage-asc") sortOptions = { mileage: 1 };
    if (sortBy === "mileage-desc") sortOptions = { mileage: -1 };
    if (sortBy === "price-asc") sortOptions = { price: 1 };
    if (sortBy === "price-desc") sortOptions = { price: -1 };
    if (sortBy === "popularity") sortOptions = { popularityScore: -1, viewsCount: -1 };

    // 5. Pagination math
    const limitNum = parseInt(limit, 10) || 20;
    const pageNum = parseInt(page, 10) || 1;
    const skipNum = (pageNum - 1) * limitNum;

    // 6. Execute paginated query and total match
    const totalCount = await Vehicle.countDocuments(query);
    const vehicles = await Vehicle.find(query)
      .sort(sortOptions)
      .skip(skipNum)
      .limit(limitNum);

    // 7. Compute marketPrice for each vehicle using unified engine (20/80 hybrid)
    const vehiclesWithPrice = await Promise.all(
      vehicles.map(async (vehicle) => {
        // Sanitize mileage to fix extreme values (e.g., 3.8M km → 38k km)
        const sanitizedMileage = sanitizeMileage(vehicle.mileage || 0);
        
        const mlPrice = await getMlPrediction(vehicle);
        
        // Use FULL pricing engine with 20/80 hybrid weighting
        const valuation = calculateVehiclePricing({
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          vehicle_age: vehicle.vehicle_age,
          mileage: sanitizedMileage,
          mlPredictedPrice: mlPrice,
          original_price: vehicle.original_price || null,
          segment: vehicle.segment || null,
          condition: vehicle.condition || 'good',
        });

        return {
          ...(vehicle.toObject ? vehicle.toObject() : vehicle._doc),
          mileage: sanitizedMileage, // Use sanitized mileage
          marketPrice: valuation.market_price,
          insuranceValue: valuation.insurance_value,
          baseValue: valuation.base_value,
          residualValue: valuation.residual_value,
          distressValue: valuation.distress_value,
          salvageValue: valuation.salvage_value,
        };
      }),
    );

    res.json({
      vehicles: vehiclesWithPrice,
      total: totalCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✅ GET SINGLE vehicle by ID - WITH valuation
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewsCount: 1 } },
      { new: true }
    );
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    // Compute valuation for single vehicle using unified engine (20/80 hybrid)
    // Sanitize mileage to fix extreme values
    const sanitizedMileage = sanitizeMileage(vehicle.mileage || 0);
    
    const mlPrice = await getMlPrediction(vehicle);
    
    // Use FULL pricing engine with 20/80 hybrid weighting
    const valuation = calculateVehiclePricing({
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      vehicle_age: vehicle.vehicle_age,
      mileage: sanitizedMileage,
      mlPredictedPrice: mlPrice,
      original_price: vehicle.original_price || null,
      segment: vehicle.segment || null,
      condition: vehicle.condition || 'good',
    });

    const vehicleWithValuation = {
      ...(vehicle.toObject ? vehicle.toObject() : vehicle._doc),
      mileage: sanitizedMileage, // Use sanitized mileage
      marketPrice: valuation.market_price,
      insuranceValue: valuation.insurance_value,
      baseValue: valuation.base_value,
      residualValue: valuation.residual_value,
      distressValue: valuation.distress_value,
      salvageValue: valuation.salvage_value,
    };

    res.json(vehicleWithValuation);
  } catch (error) {
    res.status(500).json({ message: "Error fetching vehicle details" });
  }
});

// ✅ UPDATE vehicle — RBAC: Only owning seller, owning bank, or admin
router.put("/:id", verifyToken, authorizeRoles("seller", "bank", "admin"), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid vehicle ID format" });
    }

    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    // Ownership check: seller/bank can only modify their own vehicle
    if (!checkResourceOwnership(vehicle.sellerId, req.user)) {
      return res.status(403).json({
        error: "Forbidden. You do not have permission to modify this vehicle listing."
      });
    }

    // Protect administrative and status fields from unauthorized modification
    const updates = { ...req.body };
    const userRole = normalizeRole(req.user.role);
    if (userRole !== "admin") {
      delete updates.verificationStatus;
      delete updates.governanceStatus;
      delete updates.confidenceScore;
      delete updates.sellerId;
    }

    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({ success: true, message: "Vehicle updated successfully", vehicle: updatedVehicle });
  } catch (error) {
    res.status(500).json({ error: "Failed to update vehicle", message: error.message });
  }
});

// ✅ DELETE vehicle — RBAC: Only owning seller, owning bank, or admin
router.delete("/:id", verifyToken, authorizeRoles("seller", "bank", "admin"), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid vehicle ID format" });
    }

    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    // Ownership check: seller/bank can only delete their own vehicle
    if (!checkResourceOwnership(vehicle.sellerId, req.user)) {
      return res.status(403).json({
        error: "Forbidden. You do not have permission to delete this vehicle listing."
      });
    }

    await Vehicle.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Vehicle listing deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete vehicle", message: error.message });
  }
});

module.exports = router;
