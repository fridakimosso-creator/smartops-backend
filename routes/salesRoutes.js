const express = require("express");
const router = express.Router();

const salesController = require("../controllers/salesController");


// ===============================
// 🛡️ SAFETY CHECK (DEBUG ONLY)
// ===============================
Object.keys(salesController).forEach((key) => {
  if (typeof salesController[key] !== "function") {
    console.warn(`⚠️ salesController.${key} is NOT a function`);
  }
});


// ===============================
// 📦 SALES CORE (FINAL SALES)
// ===============================
router.post("/", salesController.createSale);
router.get("/", salesController.getSales);
router.get("/daily", salesController.getDailyRevenue);


// ===============================
// 🟡 PENDING SALES (APPROVAL FLOW)
// ===============================
router.get("/pending", salesController.getPendingSales);
router.put("/approve/:id", salesController.approveSale);
router.put("/reject/:id", salesController.rejectSale);


// ===============================
// ⚠️ IMPORTANT FIX (ORDER OF ROUTES)
// ===============================
// (NO dynamic routes like /:id BEFORE /pending)
// This prevents route conflicts


module.exports = router;