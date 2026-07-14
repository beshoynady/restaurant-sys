import express from "express";
import productionRecordController from "./production-record.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  paramsProductionRecordSchema,
  queryProductionRecordSchema,
} from "./production-record.validation.js";

// Enterprise Production Platform: this router was previously an empty stub. Rebuilt read-only
// (GET only), mirroring stock-ledger.router.js's own precedent exactly — every ProductionRecord
// row is only ever written internally by ProductionOrderService.complete(), never directly by a
// client; there is no legitimate direct-write use case to gate, so create/update/delete are
// omitted entirely rather than merely permission-gated.
const router = express.Router();

router.get(
  "/",
  authenticateToken,
  authorize("ProductionRecords", "read"),
  checkModuleEnabled("production"),
  validate(queryProductionRecordSchema),
  productionRecordController.getAll,
);

router.get(
  "/:id",
  authenticateToken,
  authorize("ProductionRecords", "read"),
  checkModuleEnabled("production"),
  validate(paramsProductionRecordSchema, "params"),
  productionRecordController.getOne,
);

export default router;
