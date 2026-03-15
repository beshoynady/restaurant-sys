import express from "express";
const router = express.Router();

import { authenticateToken } from "../../middlewares/authenticate.js";

import {
  createInvoiceSettings,
  getInvoiceSettings,
  updateInvoiceSettings,
  deleteInvoiceSettings,
} from "../../controllers/sales/invoice-settings.controller.js";

/**
 * ============================
 * Invoice Settings Routes
 * ============================
 */

router.post(
  "/",
  authenticateToken,
  createInvoiceSettings
);

router.get(
  "/",
  authenticateToken,
  getInvoiceSettings
);

router.put(
  "/:settingsId",
  authenticateToken,
  updateInvoiceSettings
);

router.delete(
  "/:settingsId",
  authenticateToken,
  deleteInvoiceSettings
);

export default router;
