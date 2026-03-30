import express from "express";
import serviceChargeController from "../../controllers/system/service-charge.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createserviceChargeSchema, updateserviceChargeSchema } from "../../validation/system/service-charge.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createserviceChargeSchema), serviceChargeController.create)
  .get(authenticateToken, serviceChargeController.getAll)
;

router.route("/:id")
  .get(authenticateToken, serviceChargeController.getOne)
  .put(authenticateToken, validate(updateserviceChargeSchema), serviceChargeController.update)
  .delete(authenticateToken, serviceChargeController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, serviceChargeController.restore)
;



export default router;
