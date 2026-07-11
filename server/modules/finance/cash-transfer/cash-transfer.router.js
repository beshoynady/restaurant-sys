import express from "express";
import cashTransferController from "./cash-transfer.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import { 
  createCashTransferSchema, 
  updateCashTransferSchema, 
  paramsCashTransferSchema, 
  paramsCashTransferIdsSchema,
  queryCashTransferSchema 
} from "./cash-transfer.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("CashTransfers", "create"),
    checkModuleEnabled("financial"), validate(createCashTransferSchema), cashTransferController.create)
  .get(authenticateToken,
    authorize("CashTransfers", "read"),
    checkModuleEnabled("financial"), validate(queryCashTransferSchema), cashTransferController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("CashTransfers", "read"),
    checkModuleEnabled("financial"), validate(paramsCashTransferSchema), cashTransferController.getOne)
  .put(authenticateToken,
    authorize("CashTransfers", "update"),
    checkModuleEnabled("financial"), validate(updateCashTransferSchema), cashTransferController.update)
  .delete(authenticateToken,
    authorize("CashTransfers", "delete"),
    checkModuleEnabled("financial"), validate(paramsCashTransferSchema), cashTransferController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("CashTransfers", "delete"),
    checkModuleEnabled("financial"), validate(paramsCashTransferSchema), cashTransferController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("CashTransfers", "update"),
    checkModuleEnabled("financial"), validate(paramsCashTransferSchema), cashTransferController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("CashTransfers", "delete"),
    checkModuleEnabled("financial"), validate(paramsCashTransferIdsSchema), cashTransferController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("CashTransfers", "delete"),
    checkModuleEnabled("financial"),validate(paramsCashTransferIdsSchema), cashTransferController.bulkSoftDelete);


export default router;
