const express = require("express");
const router = express.Router();

const {
  getDashboardSummary,
  getDailySales,
  getDailyOrders,
  getTopCustomers
} = require("../controllers/reportController");

router.get("/summary", getDashboardSummary);
router.get("/sales/daily", getDailySales);
router.get("/orders/daily", getDailyOrders);
router.get("/top-customers", getTopCustomers);

module.exports = router;