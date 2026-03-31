import express from "express";
import consumptionController from "../../controllers/inventory/consumption.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createConsumptionSchema, updateConsumptionSchema } from "../../validation/inventory/consumption.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createConsumptionSchema), consumptionController.create)
  .get(authenticateToken, consumptionController.getAll)
;

router.route("/:id")
  .get(authenticateToken, consumptionController.getOne)
  .put(authenticateToken, validate(updateConsumptionSchema), consumptionController.update)
  .delete(authenticateToken, consumptionController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, consumptionController.restore)
;



export default router;
