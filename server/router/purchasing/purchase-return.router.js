import express from "express";
import purchaseReturnController from "../../controllers/purchasing/purchase-return.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createPurchaseReturnSchema, 
  updatePurchaseReturnSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/purchasing/purchase-return.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createPurchaseReturnSchema), purchaseReturnController.create)
  .get(authenticateToken, validate(querySchema()), purchaseReturnController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), purchaseReturnController.getOne)
  .put(authenticateToken, validate(updatePurchaseReturnSchema), purchaseReturnController.update)
  .delete(authenticateToken, validate(paramsSchema()), purchaseReturnController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), purchaseReturnController.restore)
;

export default router;
