// ===== IMPORTS =====
const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const cors = require("cors");
const path = require("path"); // for static files + sendFile

// ===== APP SETUP =====
const app = express();
const PORT = 3000; // backend will run on http://localhost:3000

// ===== MIDDLEWARES =====
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:5500",
      "http://localhost:5500",
      "http://127.0.0.1:5501",
      "http://localhost:5501",
      "http://127.0.0.1:5502",
      "http://localhost:5502",
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(
  session({
    secret: "mysecretkey",
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false, // true only if https
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);

// ===== STATIC FRONTEND =====
// Make sure: auth-backend/public/login.html, signup.html, dashboard.html, ...
app.use(express.static(path.join(__dirname, "public")));

// ===== MYSQL CONNECTION =====
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "123456789",
  database: "my_website",
});

db.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err.message);
  } else {
    console.log("✅ Connected to MySQL database");
  }
});

// ===== AUTH MIDDLEWARE =====
function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  } else {
    // JSON API ke liye 401, pages ke liye redirect use karenge alag route me
    return res.status(401).json({ message: "Not authorized. Please log in." });
  }
}

// ===== ROUTES =====

// Simple test route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Backend is running!" });
});

// ✅ PROTECTED DASHBOARD PAGE ROUTE
// URL: http://localhost:3000/dashboard-page
// Ye page sirf logged-in user ko milega
app.get("/dashboard-page", (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.redirect("/login.html");
  }
  return res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// SIGNUP: POST /signup
app.post("/signup", (req, res) => {
  console.log("📩 /signup hit with body:", req.body);

  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const checkUserQuery = "SELECT * FROM users WHERE email = ?";
  db.query(checkUserQuery, [email], async (err, results) => {
    if (err) {
      console.error("Error checking user:", err);
      return res.status(500).json({ message: "Server error" });
    }

    if (results.length > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    try {
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      const insertUserQuery =
        "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)";

      db.query(insertUserQuery, [name, email, passwordHash], (err, result) => {
        if (err) {
          console.error("Error inserting user:", err);
          return res.status(500).json({ message: "Server error" });
        }

        req.session.userId = result.insertId;
        req.session.userName = name;

        return res
          .status(201)
          .json({ message: "User registered successfully" });
      });
    } catch (hashErr) {
      console.error("Error hashing password:", hashErr);
      return res.status(500).json({ message: "Server error" });
    }
  });
});

// LOGIN: POST /login
app.post("/login", (req, res) => {
  console.log("📩 /login hit with body:", req.body);

  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required" });
  }

  const findUserQuery = "SELECT * FROM users WHERE email = ?";
  db.query(findUserQuery, [email], async (err, results) => {
    if (err) {
      console.error("Error finding user:", err);
      return res.status(500).json({ message: "Server error" });
    }

    if (results.length === 0) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const user = results[0];

    try {
      const isMatch = await bcrypt.compare(password, user.password_hash);

      if (!isMatch) {
        return res.status(400).json({ message: "Invalid email or password" });
      }

      req.session.userId = user.id;
      req.session.userName = user.name;

      return res.json({ message: "Login successful" });
    } catch (compareErr) {
      console.error("Error comparing password:", compareErr);
      return res.status(500).json({ message: "Server error" });
    }
  });
});

// DASHBOARD JSON API: GET /dashboard (protected)
app.get("/dashboard", isAuthenticated, (req, res) => {
  res.json({
    message: `Welcome to your dashboard, ${req.session.userName}!`,
    userId: req.session.userId,
  });
});

// ===== LISTINGS ROUTES (PROTECTED) =====

// Create a new listing  (used by addlist.html)
app.post("/listings", isAuthenticated, (req, res) => {
  const userId = req.session.userId;

  const {
    title,
    description,
    type,
    city,        // from "location" field on frontend
    price,
    bhk,         // bedrooms
    bathrooms,
    contact,
  } = req.body;

  if (!title || !city || !price) {
    return res
      .status(400)
      .json({ message: "Title, location and price are required" });
  }

  const insertQuery = `
    INSERT INTO properties
      (user_id, title, description, type, city, price, bhk, bathrooms, contact)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    insertQuery,
    [
      userId,
      title,
      description || null,
      type || null,
      city,
      price,
      bhk || null,
      bathrooms || null,
      contact || null,
    ],
    (err, result) => {
      if (err) {
        console.error("Error inserting listing:", err);
        return res
          .status(500)
          .json({ message: "Server error while creating listing" });
      }

      return res.status(201).json({
        message: "Listing created successfully",
        listingId: result.insertId,
      });
    }
  );
});

// Get all listings for the logged-in user
app.get("/my-listings", isAuthenticated, (req, res) => {
  const userId = req.session.userId;

  const selectQuery = `
    SELECT
      id,
      title,
      description,
      type,
      city AS location,
      price,
      bhk,
      bathrooms,
      contact
    FROM properties
    WHERE user_id = ?
    ORDER BY id DESC
  `;

  db.query(selectQuery, [userId], (err, rows) => {
    if (err) {
      console.error("Error fetching listings:", err);
      return res
        .status(500)
        .json({ message: "Server error while loading listings" });
    }

    return res.json({ listings: rows });
  });
});

// Small summary for dashboard: count of user's listings
app.get("/my-listings-summary", isAuthenticated, (req, res) => {
  const userId = req.session.userId;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM properties
    WHERE user_id = ?
  `;

  db.query(countQuery, [userId], (err, rows) => {
    if (err) {
      console.error("Error counting listings:", err);
      return res
        .status(500)
        .json({ message: "Server error while counting listings" });
    }

    const total = rows[0]?.total || 0;
    res.json({ total });
  });
});

// Delete a listing (only if it belongs to the user)
app.delete("/listings/:id", isAuthenticated, (req, res) => {
  const userId = req.session.userId;
  const listingId = req.params.id;

  const deleteQuery = `
    DELETE FROM properties
    WHERE id = ? AND user_id = ?
  `;

  db.query(deleteQuery, [listingId, userId], (err, result) => {
    if (err) {
      console.error("Error deleting listing:", err);
      return res
        .status(500)
        .json({ message: "Server error while deleting listing" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Listing not found" });
    }

    return res.json({ message: "Listing deleted successfully" });
  });
});

// ===== MEETINGS ROUTES (PROTECTED) =====

// POST /book-meeting  -> save a new meeting
app.post("/book-meeting", isAuthenticated, (req, res) => {
  const userId = req.session.userId;

  const {
    fullName,
    email,
    phone,
    propertyId,
    propertyName,      // optional text, in case you send it
    meetingType,
    preferredDateTime, // string from <input type="datetime-local">
    preferredDealer,
    notes,
  } = req.body;

  // Basic validation
  if (!fullName || !email || !phone || !preferredDateTime) {
    return res.status(400).json({
      message: "Full name, email, phone and date/time are required",
    });
  }

  const insertQuery = `
    INSERT INTO meetings
      (user_id, full_name, email, phone,
       property_id, property_name,
       meeting_type, preferred_datetime,
       preferred_dealer, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  // Convert to JS Date; MySQL driver will handle DATETIME
  const dt = new Date(preferredDateTime);

  db.query(
    insertQuery,
    [
      userId,
      fullName,
      email,
      phone,
      propertyId || null,
      propertyName || null,
      meetingType || "In-person",
      dt,
      preferredDealer || null,
      notes || null,
    ],
    (err, result) => {
      if (err) {
        console.error("Error inserting meeting:", err);
        return res
          .status(500)
          .json({ message: "Server error while saving meeting" });
      }

      return res.status(201).json({
        message: "Meeting booked successfully",
        meetingId: result.insertId,
      });
    }
  );
});

// GET /my-meetings  -> all meetings for logged-in user
app.get("/my-meetings", isAuthenticated, (req, res) => {
  const userId = req.session.userId;

  const selectQuery = `
    SELECT
      id,
      full_name AS fullName,
      email,
      phone,
      property_id AS propertyId,
      property_name AS propertyName,
      meeting_type AS meetingType,
      preferred_datetime AS preferredDateTime,
      preferred_dealer AS preferredDealer,
      notes,
      status,
      created_at AS createdAt
    FROM meetings
    WHERE user_id = ?
    ORDER BY preferred_datetime DESC
  `;

  db.query(selectQuery, [userId], (err, rows) => {
    if (err) {
      console.error("Error fetching meetings:", err);
      return res
        .status(500)
        .json({ message: "Server error while loading meetings" });
    }

    return res.json({ meetings: rows });
  });
});

// Small summary for dashboard: count of user's meetings
app.get("/my-meetings-summary", isAuthenticated, (req, res) => {
  const userId = req.session.userId;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM meetings
    WHERE user_id = ?
  `;

  db.query(countQuery, [userId], (err, rows) => {
    if (err) {
      console.error("Error counting meetings:", err);
      return res
        .status(500)
        .json({ message: "Server error while counting meetings" });
    }

    const total = rows[0]?.total || 0;
    res.json({ total });
  });
});

// LOGOUT: POST /logout
app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).json({ message: "Server error" });
    }
    res.clearCookie("connect.sid");
    return res.json({ message: "Logged out successfully" });
  });
});

// ===== START SERVER (KEEP THIS LAST) =====
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
