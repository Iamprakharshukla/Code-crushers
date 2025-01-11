const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// MongoDB Connection
mongoose.connect("mongodb://127.0.0.1:27017/meetingBookingDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB Connected"))
.catch((err) => console.error("MongoDB Connection Failed:", err));

// Booking Schema (From the previous functionality)
const bookingSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  property: String,
  meetingType: String,
  date: Date,
  dealer: String,
  notes: String,
});
const Booking = mongoose.model("Booking", bookingSchema);

// New Schema for Listings
const listingSchema = new mongoose.Schema({
  title: String,
  description: String,
  type: String,
  location: String,
  price: Number,
  bedrooms: Number,
  bathrooms: Number,
  contact: String,
  images: [String],
});
const Listing = mongoose.model("Listing", listingSchema);

// Multer Setup for File Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// Booking Routes (From the previous functionality)
app.post("/api/bookings", async (req, res) => {
  try {
    const booking = new Booking(req.body);
    await booking.save();
    res.status(201).send({ message: "Booking saved successfully", booking });
  } catch (error) {
    console.error("Error saving booking:", error);
    res.status(500).send({ message: "Failed to save booking", error });
  }
});

// Listing Routes
app.post("/api/listings", upload.array("images", 5), async (req, res) => {
  try {
    const { title, description, type, location, price, bedrooms, bathrooms, contact } = req.body;
    const imagePaths = req.files.map(file => file.path);

    const newListing = new Listing({
      title,
      description,
      type,
      location,
      price,
      bedrooms: bedrooms || 0,
      bathrooms: bathrooms || 0,
      contact,
      images: imagePaths,
    });

    await newListing.save();
    res.status(201).send({ message: "Listing added successfully", listing: newListing });
  } catch (error) {
    console.error("Error adding listing:", error);
    res.status(500).send({ message: "Failed to add listing", error });
  }
});

app.get("/api/listings", async (req, res) => {
  try {
    const listings = await Listing.find();
    res.status(200).json(listings);
  } catch (error) {
    console.error("Error fetching listings:", error);
    res.status(500).send({ message: "Failed to fetch listings", error });
  }
});

// Server Setup
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
