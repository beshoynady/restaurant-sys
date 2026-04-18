import express from "express";
import purchaseController from "../../controllers/purchasing/purchase.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createPurchaseSchema, 
  updatePurchaseSchema, 
  paramsPurchaseSchema, 
  paramsPurchaseIdsSchema,
  queryPurchaseSchema 
} from "../../validation/purchasing/purchase.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createPurchaseSchema), purchaseController.create)
  .get(authenticateToken, validate(queryPurchaseSchema), purchaseController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsPurchaseSchema), purchaseController.getOne)
  .put(authenticateToken, validate(updatePurchaseSchema), purchaseController.update)
  .delete(authenticateToken, validate(paramsPurchaseSchema), purchaseController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsPurchaseSchema), purchaseController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsPurchaseSchema), purchaseController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsPurchaseIdsSchema), purchaseController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsPurchaseIdsSchema), purchaseController.bulkSoftDelete);


export default router;
