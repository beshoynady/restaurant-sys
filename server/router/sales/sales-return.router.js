import express from "express";
import salesReturnController from "../../controllers/sales/sales-return.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createSalesReturnSchema, updateSalesReturnSchema, salesReturnParamsSchema, salesReturnQuerySchema } from "../../validation/sales/sales-return.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createSalesReturnSchema), salesReturnController.create)
  .get(authenticateToken, validate(salesReturnQuerySchema), salesReturnController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(salesReturnParamsSchema), salesReturnController.getOne)
  .put(authenticateToken, validate(updateSalesReturnSchema), salesReturnController.update)
  .delete(authenticateToken, validate(salesReturnParamsSchema), salesReturnController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(salesReturnParamsSchema), salesReturnController.restore)
;

export default router;
