require("dotenv").config();
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");

const Vehicle = require("./models/Vehicle");

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// Connect MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

const uploadImages = async () => {
  try {
    const vehicles = await Vehicle.find();

    const imageFolder = path.join(__dirname, "images");
    const imageFiles = fs.readdirSync(imageFolder);

    console.log(`Images found: ${imageFiles.length}`);
    console.log(`Vehicles found: ${vehicles.length}`);

    for (let i = 0; i < vehicles.length; i++) {
      const vehicle = vehicles[i];

      const imagePath = path.join(
        imageFolder,
        imageFiles[i % imageFiles.length]
      );

      const result = await cloudinary.uploader.upload(imagePath, {
        folder: "vehicles",
      });

      vehicle.images = [result.secure_url];
      await vehicle.save();

      console.log(`✅ Updated ${i + 1}/${vehicles.length}`);
    }

    console.log("DONE");
    process.exit();

  } catch (error) {
    console.error(error);
  }
};

uploadImages();