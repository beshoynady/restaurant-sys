import express from "express";
import cashRegisterController from "./cash-register.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import { 
  createCashRegisterSchema, 
  updateCashRegisterSchema, 
  paramsCashRegisterSchema, 
  paramsCashRegisterIdsSchema,
  queryCashRegisterSchema 
} from "./cash-register.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("CashRegisters", "create"),
    checkModuleEnabled("financial"), validate(createCashRegisterSchema), cashRegisterController.create)
  .get(authenticateToken,
    authorize("CashRegisters", "read"),
    checkModuleEnabled("financial"), validate(queryCashRegisterSchema), cashRegisterController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("CashRegisters", "read"),
    checkModuleEnabled("financial"), validate(paramsCashRegisterSchema), cashRegisterController.getOne)
  .put(authenticateToken,
    authorize("CashRegisters", "update"),
    checkModuleEnabled("financial"), validate(updateCashRegisterSchema), cashRegisterController.update)
  .delete(authenticateToken,
    authorize("CashRegisters", "delete"),
    checkModuleEnabled("financial"), validate(paramsCashRegisterSchema), cashRegisterController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("CashRegisters", "delete"),
    checkModuleEnabled("financial"), validate(paramsCashRegisterSchema), cashRegisterController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("CashRegisters", "update"),
    checkModuleEnabled("financial"), validate(paramsCashRegisterSchema), cashRegisterController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("CashRegisters", "delete"),
    checkModuleEnabled("financial"), validate(paramsCashRegisterIdsSchema), cashRegisterController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("CashRegisters", "delete"),
    checkModuleEnabled("financial"),validate(paramsCashRegisterIdsSchema), cashRegisterController.bulkSoftDelete);


export default router;
