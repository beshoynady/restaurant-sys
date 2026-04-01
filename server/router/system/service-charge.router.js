import express from "express";
import serviceChargeController from "../../controllers/system/service-charge.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createServiceChargeSchema, updateServiceChargeSchema, serviceChargeParamsSchema, serviceChargeQuerySchema } from "../../validation/system/service-charge.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createServiceChargeSchema), serviceChargeController.create)
  .get(authenticateToken, validate(serviceChargeQuerySchema), serviceChargeController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(serviceChargeParamsSchema), serviceChargeController.getOne)
  .put(authenticateToken, validate(updateServiceChargeSchema), serviceChargeController.update)
  .delete(authenticateToken, validate(serviceChargeParamsSchema), serviceChargeController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(serviceChargeParamsSchema), serviceChargeController.restore)
;

export default router;
