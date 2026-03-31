import express from "express";
import salesReturnController from "../../controllers/sales/sales-return.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createSalesReturnSchema, updateSalesReturnSchema } from "../../validation/sales/sales-return.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createSalesReturnSchema), salesReturnController.create)
  .get(authenticateToken, salesReturnController.getAll)
;

router.route("/:id")
  .get(authenticateToken, salesReturnController.getOne)
  .put(authenticateToken, validate(updateSalesReturnSchema), salesReturnController.update)
  .delete(authenticateToken, salesReturnController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, salesReturnController.restore)
;



export default router;
