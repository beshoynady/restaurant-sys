import express from "express";
import taxConfigController from "../../controllers/system/tax-config.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createTaxConfigSchema, updateTaxConfigSchema, taxConfigParamsSchema, taxConfigQuerySchema } from "../../validation/system/tax-config.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createTaxConfigSchema), taxConfigController.create)
  .get(authenticateToken, validate(taxConfigQuerySchema), taxConfigController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(taxConfigParamsSchema), taxConfigController.getOne)
  .put(authenticateToken, validate(updateTaxConfigSchema), taxConfigController.update)
  .delete(authenticateToken, validate(taxConfigParamsSchema), taxConfigController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(taxConfigParamsSchema), taxConfigController.restore)
;

export default router;
