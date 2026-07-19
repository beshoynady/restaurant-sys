// Router — ADR-001-SALES-PAYMENT-ARCHITECTURE.md Phase 1. Mandatory chain on every route:
// authenticateToken, authorize(resource, action), checkModuleEnabled(key), validate(schema), controller.
import express from "express";
import paymentController from "./payment.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  recordPaymentSchema, paramsPaymentSchema, queryPaymentSchema,
} from "./payment.validation.js";

const RESOURCE = "Payments";
// Matches invoice.router.js exactly — Payment is a sales-domain resource, same module toggle.
const MODULE_KEY = "sales";

const router = express.Router();

// No PUT/DELETE: a Payment is an immutable event record once recorded (matching JournalEntry's own
// lack of a generic update/delete path) — voiding is a separate, not-yet-built Phase 2 action.
router.route("/")
  .post(authenticateToken, authorize(RESOURCE, "create"), checkModuleEnabled(MODULE_KEY),
    validate(recordPaymentSchema), paymentController.create)
  .get(authenticateToken, authorize(RESOURCE, "read"), checkModuleEnabled(MODULE_KEY),
    validate(queryPaymentSchema), paymentController.getAll);

router.route("/:id")
  .get(authenticateToken, authorize(RESOURCE, "read"), checkModuleEnabled(MODULE_KEY),
    validate(paramsPaymentSchema, "params"), paymentController.getOne);

export default router;
