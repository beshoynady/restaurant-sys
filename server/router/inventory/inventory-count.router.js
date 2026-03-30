import express from "express";
import inventoryCountController from "../../controllers/inventory/inventory-count.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createinventoryCountSchema, updateinventoryCountSchema } from "../../validation/inventory/inventory-count.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createinventoryCountSchema), inventoryCountController.create)
  .get(authenticateToken, inventoryCountController.getAll)
;

router.route("/:id")
  .get(authenticateToken, inventoryCountController.getOne)
  .put(authenticateToken, validate(updateinventoryCountSchema), inventoryCountController.update)
  .delete(authenticateToken, inventoryCountController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, inventoryCountController.restore)
;



export default router;
