import express from "express";
import salesReturnController from "../../controllers/sales/sales-return.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createsalesReturnSchema, updatesalesReturnSchema } from "../../validation/sales/sales-return.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createsalesReturnSchema), salesReturnController.create)
  .get(authenticateToken, salesReturnController.getAll)
;

router.route("/:id")
  .get(authenticateToken, salesReturnController.getOne)
  .put(authenticateToken, validate(updatesalesReturnSchema), salesReturnController.update)
  .delete(authenticateToken, salesReturnController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, salesReturnController.restore)
;



export default router;
