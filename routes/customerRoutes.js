const express = require("express");
const router = express.Router();

const {
  getCustomers,
  createCustomer,
  searchCustomers,
  updateCustomer,
  deleteCustomer,
} = require("../controllers/customerController");

// ==========================
// BASIC CRUD
// ==========================
router.get("/", getCustomers);
router.post("/", createCustomer);

// ==========================
// SEARCH (FOR SALES POS)
// ==========================
router.get("/search", searchCustomers);

// ==========================
// UPDATE / DELETE
// ==========================
router.put("/:id", updateCustomer);
router.delete("/:id", deleteCustomer);

module.exports = router;