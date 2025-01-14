const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

require("dotenv").config(); // For environment variables

const app = express();

// Middleware
app.use(cors({
  origin: "http://127.0.0.1:5502", // Allow frontend origin
  methods: ["GET", "POST"],       // Allow specific methods
  credentials: true,              // Allow cookies and credentials
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/meetingBookingDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Connection Failed:", err));

// Schemas and Models
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

const userSchema = new mongoose.Schema({
  fullName: String,
  email: { type: String, unique: true },
  password: String,
});
const User = mongoose.model("User", userSchema);

// Multer Setup for File Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// Routes

// Booking Routes
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
    const imagePaths = req.files.map((file) => file.path);

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

// Authentication Routes
app.post("/api/signup", async (req, res) => {
  const { fullName, email, password, confirmPassword } = req.body;

  if (!fullName || !email || !password || !confirmPassword) {
    return res.status(400).send({ message: "All fields are required" });
  }

  if (password !== confirmPassword) {
    return res.status(400).send({ message: "Passwords do not match" });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send({ message: "Email is already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ fullName, email, password: hashedPassword });
    await user.save();

    res.status(201).send({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error during signup:", error);
    res.status(500).send({ message: "Failed to register user", error });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send({ message: "Email and password are required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).send({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).send({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "default_secret", { expiresIn: "1h" });
    res.status(200).send({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).send({ message: "Failed to login", error });
  }
});

// Server Setup
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
