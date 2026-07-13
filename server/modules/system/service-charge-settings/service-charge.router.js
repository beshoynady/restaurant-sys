import express from "express";
import serviceChargeController from "./service-charge.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import validate from "../../../middlewares/validate.js";
import { 
  createServiceChargeSchema, 
  updateServiceChargeSchema, 
  paramsServiceChargeSchema, 
  paramsServiceChargeIdsSchema,
  queryServiceChargeSchema 
} from "./service-charge.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("ServiceCharges", "create"), validate(createServiceChargeSchema), serviceChargeController.create)
  .get(authenticateToken,
    authorize("ServiceCharges", "read"), validate(queryServiceChargeSchema), serviceChargeController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("ServiceCharges", "read"), validate(paramsServiceChargeSchema, "params"), serviceChargeController.getOne)
  .put(authenticateToken,
    authorize("ServiceCharges", "update"), validate(updateServiceChargeSchema), serviceChargeController.update)
  .delete(authenticateToken,
    authorize("ServiceCharges", "delete"), validate(paramsServiceChargeSchema, "params"), serviceChargeController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("ServiceCharges", "delete"), validate(paramsServiceChargeSchema, "params"), serviceChargeController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("ServiceCharges", "update"), validate(paramsServiceChargeSchema, "params"), serviceChargeController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("ServiceCharges", "delete"), validate(paramsServiceChargeIdsSchema), serviceChargeController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("ServiceCharges", "delete"),validate(paramsServiceChargeIdsSchema), serviceChargeController.bulkSoftDelete);


export default router;
