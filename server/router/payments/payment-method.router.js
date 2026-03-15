import express from "express";
const router = express.Router();
import { authenticateToken } from "../../middlewares/authenticate.js";

import {
  createPaymentMethod,
  updatePaymentMethod,
  getPaymentMethods,
  deletePaymentMethod,
} from "../../controllers/payments/payment-method.controller.js";

// ✅ Create payment method
router.post("/", authenticateToken, createPaymentMethod);

// ✅ Update payment method by ID
router.put("/:id", authenticateToken, updatePaymentMethod);

// ✅ Get all payment methods (optional filters: brand, branch)
router.get("/", authenticateToken, getPaymentMethods);

// ✅ Delete payment method by ID
router.delete("/:id", authenticateToken, deletePaymentMethod);

export default router;
