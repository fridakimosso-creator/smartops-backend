const express = require("express");
const cors = require("cors");
require("dotenv").config();

// ==========================
// APP SETUP
// ==========================
const app = express();

app.use(cors());
app.use(express.json());

// ==========================
// DATABASE CONNECTION TEST
// ==========================
const db = require("./config/db");

db.getConnection()
  .then(() => {
    console.log("✅ Database connected successfully");
  })
  .catch((err) => {
    console.log("❌ Database connection error:", err);
  });

// ==========================
// ROUTES IMPORTS
// ==========================
const customerRoutes = require("./routes/customerRoutes");
const orderRoutes = require("./routes/orderRoutes");
const salesRoutes = require("./routes/salesRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const reportRoutes = require("./routes/reportRoutes");
const dashboardRoutes= require("./routes/dashboardRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");


// ==========================
// ROUTES USAGE
// ==========================
app.use("/api/customers", customerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
// ==========================
// HEALTH CHECK ROUTE
// ==========================
app.get("/", (req, res) => {
  res.json({
    message: "SmartOps API is running 🚀"
  });
});

// ==========================
// ERROR HANDLING (GLOBAL)
// ==========================
app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);
  res.status(500).json({
    message: "Internal server error"
  });
});

// ==========================
// START SERVER
// ==========================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});