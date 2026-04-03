import express from "express";
import deliveryAreaController from "../../controllers/core/delivery-area.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createDeliveryAreaSchema, 
  updateDeliveryAreaSchema, 
  paramsDeliveryAreaSchema, 
  paramsDeliveryAreaIdsSchema,
  queryDeliveryAreaSchema 
} from "../../validation/core/delivery-area.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createDeliveryAreaSchema), deliveryAreaController.create)
  .get(authenticateToken, validate(queryDeliveryAreaSchema), deliveryAreaController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsDeliveryAreaSchema), deliveryAreaController.getOne)
  .put(authenticateToken, validate(updateDeliveryAreaSchema), deliveryAreaController.update)
  .delete(authenticateToken, validate(paramsDeliveryAreaSchema), deliveryAreaController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsDeliveryAreaSchema), deliveryAreaController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsDeliveryAreaSchema), deliveryAreaController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsDeliveryAreaIdsSchema), deliveryAreaController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsDeliveryAreaIdsSchema), deliveryAreaController.bulkSoftDelete);


export default router;
