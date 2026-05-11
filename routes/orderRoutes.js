const express = require("express");
const router = express.Router();

const orderController = require("../controllers/orderController");

// =====================================================
// 🛡️ SAFETY CHECK
// =====================================================
Object.keys(orderController).forEach((key) => {
  if (typeof orderController[key] !== "function") {
    console.warn(`⚠️ orderController.${key} is NOT a function`);
  }
});

// =====================================================
// 📦 ORDERS (CORE)
// =====================================================
router.post("/", orderController.createOrder);
router.get("/", orderController.getOrders);

// =====================================================
// 💰 PAYMENT (APPROVAL SYSTEM ONLY)
// =====================================================

// ✅ NEW PAYMENT FLOW (SEND TO APPROVAL)
router.post("/payment", orderController.makePayment);

// =====================================================
// 📦 STATUS
// =====================================================
router.put("/:id/status", orderController.updateOrderStatus);

// =====================================================
// 🚚 DELIVERY
// =====================================================
router.put("/:id/delivered", orderController.deliverOrder);

// =====================================================
// 🟡 PENDING ORDERS (ADMIN FLOW)
// =====================================================
router.get("/pending-orders", orderController.getPendingOrders);
router.put("/approve-order/:id", orderController.approveOrder);
router.put("/reject-order/:id", orderController.rejectOrder);

// =====================================================
// 🟡 PENDING PAYMENTS (ADMIN FLOW)
// =====================================================
router.get("/pending-payments", orderController.getPendingPayments);
router.put("/approve-payment/:id", orderController.approvePayment);
router.put("/reject-payment/:id", orderController.rejectPayment);
console.log(orderController);
module.exports = router;