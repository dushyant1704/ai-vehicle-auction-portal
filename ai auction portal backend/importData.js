const fs = require("fs");
const csv = require("csv-parser");
const mongoose = require("mongoose");
require("dotenv").config();

const Vehicle = require("./models/Vehicle");

// Connect DB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

const results = [];

// Helper to extract numbers from strings (e.g. "1248 CC" -> 1248, "74 bhp" -> 74)
const extractNumber = (str) => {
  if (!str) return null;
  const num = parseFloat(str.toString().replace(/[^0-9.]/g, ""));
  return isNaN(num) ? null : num;
};

fs.createReadStream("cardekho_dataset.csv")
  .pipe(csv())
  .on("data", (data) => {
    // Only process valid rows
    if (!data.brand || !data.model) return;

    const age = Number(data.vehicle_age || 0);
    const km = Number(data.km_driven) || 0;

    const engineVal = extractNumber(data.engine) || 0;
    const maxPowerVal = extractNumber(data.max_power) || 0;
    const seatsVal = data.seats ? Number(data.seats) : 5;
    const priceVal = extractNumber(data.selling_price) || 0;

    results.push({
      brand: data.brand,
      model: data.model,
      year: 2026 - age,
      mileage: km,

      // ML Fields
      vehicle_age: age,
      fuel: data.fuel_type,
      transmission: data.transmission_type,
      engine: engineVal,
      max_power: maxPowerVal,
      seats: seatsVal,

      // Other Fields
      ownerType: data.seller_type,
      price: priceVal,

      // Media (temporary fallback if needed)
      images: [
        `https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800`
      ],
      videos: []
    });
  })
  .on("end", async () => {
    try {
      console.log("Clearing existing vehicles...");
      await Vehicle.deleteMany(); 
      
      console.log("Inserting rigorous ML datasets...");
      await Vehicle.insertMany(results);

      console.log(`✅ CarDekho Data Imported Successfully. Inserted ${results.length} rows.`);
      process.exit();
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });