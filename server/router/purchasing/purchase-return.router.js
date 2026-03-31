import express from "express";
import purchaseReturnController from "../../controllers/purchasing/purchase-return.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createPurchaseReturnSchema, updatePurchaseReturnSchema } from "../../validation/purchasing/purchase-return.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createPurchaseReturnSchema), purchaseReturnController.create)
  .get(authenticateToken, purchaseReturnController.getAll)
;

router.route("/:id")
  .get(authenticateToken, purchaseReturnController.getOne)
  .put(authenticateToken, validate(updatePurchaseReturnSchema), purchaseReturnController.update)
  .delete(authenticateToken, purchaseReturnController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, purchaseReturnController.restore)
;



export default router;
