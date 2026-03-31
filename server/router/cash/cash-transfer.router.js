import express from "express";
import cashTransferController from "../../controllers/cash/cash-transfer.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createCashTransferSchema, updateCashTransferSchema } from "../../validation/cash/cash-transfer.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createCashTransferSchema), cashTransferController.create)
  .get(authenticateToken, cashTransferController.getAll)
;

router.route("/:id")
  .get(authenticateToken, cashTransferController.getOne)
  .put(authenticateToken, validate(updateCashTransferSchema), cashTransferController.update)
  .delete(authenticateToken, cashTransferController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, cashTransferController.restore)
;



export default router;
