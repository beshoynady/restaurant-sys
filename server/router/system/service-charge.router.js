import express from "express";
import serviceChargeController from "../../controllers/system/service-charge.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createServiceChargeSchema, 
  updateServiceChargeSchema, 
  paramsServiceChargeSchema, 
  paramsServiceChargeIdsSchema,
  queryServiceChargeSchema 
} from "../../validation/system/service-charge.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createServiceChargeSchema), serviceChargeController.create)
  .get(authenticateToken, validate(queryServiceChargeSchema), serviceChargeController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsServiceChargeSchema), serviceChargeController.getOne)
  .put(authenticateToken, validate(updateServiceChargeSchema), serviceChargeController.update)
  .delete(authenticateToken, validate(paramsServiceChargeSchema), serviceChargeController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsServiceChargeSchema), serviceChargeController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsServiceChargeSchema), serviceChargeController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsServiceChargeIdsSchema), serviceChargeController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsServiceChargeIdsSchema), serviceChargeController.bulkSoftDelete);


export default router;
