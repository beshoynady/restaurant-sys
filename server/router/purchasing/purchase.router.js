import express from "express";
import purchaseController from "../../controllers/purchasing/purchase.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createPurchaseSchema, updatePurchaseSchema, purchaseParamsSchema, purchaseQuerySchema } from "../../validation/purchasing/purchase.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createPurchaseSchema), purchaseController.create)
  .get(authenticateToken, validate(purchaseQuerySchema), purchaseController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(purchaseParamsSchema), purchaseController.getOne)
  .put(authenticateToken, validate(updatePurchaseSchema), purchaseController.update)
  .delete(authenticateToken, validate(purchaseParamsSchema), purchaseController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(purchaseParamsSchema), purchaseController.restore)
;

export default router;
