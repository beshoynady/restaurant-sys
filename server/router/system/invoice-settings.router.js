const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../../middlewares/authenticate");

const {
  createInvoiceSettings,
  getInvoiceSettings,
  updateInvoiceSettings,
  deleteInvoiceSettings,
} = require("../../controllers/settings/invoice-settings.controller");

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

module.exports = router;
