import express from "express";
import deliveryAreaController from "../../controllers/core/delivery-area.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createDeliveryAreaSchema, 
  updateDeliveryAreaSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/core/delivery-area.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createDeliveryAreaSchema), deliveryAreaController.create)
  .get(authenticateToken, validate(querySchema()), deliveryAreaController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), deliveryAreaController.getOne)
  .put(authenticateToken, validate(updateDeliveryAreaSchema), deliveryAreaController.update)
  .delete(authenticateToken, validate(paramsSchema()), deliveryAreaController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), deliveryAreaController.restore)
;

export default router;
