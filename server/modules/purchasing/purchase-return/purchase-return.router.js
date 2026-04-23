import express from "express";
import purchaseReturnController from "./purchase-return.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import validate from "../../../middlewares/validate.js";
import { 
  createPurchaseReturnSchema, 
  updatePurchaseReturnSchema, 
  paramsPurchaseReturnSchema, 
  paramsPurchaseReturnIdsSchema,
  queryPurchaseReturnSchema 
} from "./purchase-return.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createPurchaseReturnSchema), purchaseReturnController.create)
  .get(authenticateToken, validate(queryPurchaseReturnSchema), purchaseReturnController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsPurchaseReturnSchema), purchaseReturnController.getOne)
  .put(authenticateToken, validate(updatePurchaseReturnSchema), purchaseReturnController.update)
  .delete(authenticateToken, validate(paramsPurchaseReturnSchema), purchaseReturnController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsPurchaseReturnSchema), purchaseReturnController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsPurchaseReturnSchema), purchaseReturnController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsPurchaseReturnIdsSchema), purchaseReturnController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsPurchaseReturnIdsSchema), purchaseReturnController.bulkSoftDelete);


export default router;
