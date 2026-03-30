import express from "express";
import warehouseController from "../../controllers/inventory/warehouse.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createwarehouseSchema, updatewarehouseSchema } from "../../validation/inventory/warehouse.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createwarehouseSchema), warehouseController.create)
  .get(authenticateToken, warehouseController.getAll)
;

router.route("/:id")
  .get(authenticateToken, warehouseController.getOne)
  .put(authenticateToken, validate(updatewarehouseSchema), warehouseController.update)
  .delete(authenticateToken, warehouseController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, warehouseController.restore)
;



export default router;
