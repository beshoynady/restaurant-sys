const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middlewares/authenticate");

const {
  createPaymentMethod,
  updatePaymentMethod,
  getPaymentMethods,
  deletePaymentMethod,
} = require("../controllers/payment-method.controller");

// ✅ Create payment method
router.post("/", authenticateToken, createPaymentMethod);

// ✅ Update payment method by ID
router.put("/:id", authenticateToken, updatePaymentMethod);

// ✅ Get all payment methods (optional filters: brand, branch)
router.get("/", authenticateToken, getPaymentMethods);

// ✅ Delete payment method by ID
router.delete("/:id", authenticateToken, deletePaymentMethod);

module.exports = router;
