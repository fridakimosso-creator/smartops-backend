const express = require("express");
const router = express.Router();

const {
  createTransaction,
  getTransactions,
  getSummary,
  getByRange,
  getFullReport
} = require("../controllers/transactionController");

router.post("/", createTransaction);
router.get("/", getTransactions);
router.get("/summary", getSummary);
router.get("/range", getByRange);

// ✅ ONLY WORKS AFTER YOU ADD CONTROLLER ABOVE
router.get("/report", getFullReport);

module.exports = router;