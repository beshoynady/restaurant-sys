import express from "express";
import purchaseReturnController from "../../controllers/purchasing/purchase-return.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createPurchaseReturnSchema, updatePurchaseReturnSchema, purchaseReturnParamsSchema, purchaseReturnQuerySchema } from "../../validation/purchasing/purchase-return.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createPurchaseReturnSchema), purchaseReturnController.create)
  .get(authenticateToken, validate(purchaseReturnQuerySchema), purchaseReturnController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(purchaseReturnParamsSchema), purchaseReturnController.getOne)
  .put(authenticateToken, validate(updatePurchaseReturnSchema), purchaseReturnController.update)
  .delete(authenticateToken, validate(purchaseReturnParamsSchema), purchaseReturnController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(purchaseReturnParamsSchema), purchaseReturnController.restore)
;

export default router;
