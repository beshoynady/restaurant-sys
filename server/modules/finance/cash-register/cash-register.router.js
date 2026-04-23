import express from "express";
import cashRegisterController from "./cash-register.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
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
  .post(authenticateToken, validate(createCashRegisterSchema), cashRegisterController.create)
  .get(authenticateToken, validate(queryCashRegisterSchema), cashRegisterController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsCashRegisterSchema), cashRegisterController.getOne)
  .put(authenticateToken, validate(updateCashRegisterSchema), cashRegisterController.update)
  .delete(authenticateToken, validate(paramsCashRegisterSchema), cashRegisterController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsCashRegisterSchema), cashRegisterController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsCashRegisterSchema), cashRegisterController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsCashRegisterIdsSchema), cashRegisterController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsCashRegisterIdsSchema), cashRegisterController.bulkSoftDelete);


export default router;
