import express from "express";
import deliveryAreaController from "../../controllers/core/delivery-area.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createDeliveryAreaSchema, updateDeliveryAreaSchema } from "../../validation/core/delivery-area.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createDeliveryAreaSchema), deliveryAreaController.create)
  .get(authenticateToken, deliveryAreaController.getAll)
;

router.route("/:id")
  .get(authenticateToken, deliveryAreaController.getOne)
  .put(authenticateToken, validate(updateDeliveryAreaSchema), deliveryAreaController.update)
  .delete(authenticateToken, deliveryAreaController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, deliveryAreaController.restore)
;



export default router;
