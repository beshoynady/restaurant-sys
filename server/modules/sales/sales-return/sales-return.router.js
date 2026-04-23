import express from "express";
import salesReturnController from "./sales-return.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import validate from "../../../middlewares/validate.js";
import { 
  createSalesReturnSchema, 
  updateSalesReturnSchema, 
  paramsSalesReturnSchema, 
  paramsSalesReturnIdsSchema,
  querySalesReturnSchema 
} from "./sales-return.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createSalesReturnSchema), salesReturnController.create)
  .get(authenticateToken, validate(querySalesReturnSchema), salesReturnController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSalesReturnSchema), salesReturnController.getOne)
  .put(authenticateToken, validate(updateSalesReturnSchema), salesReturnController.update)
  .delete(authenticateToken, validate(paramsSalesReturnSchema), salesReturnController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsSalesReturnSchema), salesReturnController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSalesReturnSchema), salesReturnController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsSalesReturnIdsSchema), salesReturnController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsSalesReturnIdsSchema), salesReturnController.bulkSoftDelete);


export default router;
