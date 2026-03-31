import express from "express";
import supplierTransactionController from "../../controllers/purchasing/supplier-transaction.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createSupplierTransactionSchema, updateSupplierTransactionSchema } from "../../validation/purchasing/supplier-transaction.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createSupplierTransactionSchema), supplierTransactionController.create)
  .get(authenticateToken, supplierTransactionController.getAll)
;

router.route("/:id")
  .get(authenticateToken, supplierTransactionController.getOne)
  .put(authenticateToken, validate(updateSupplierTransactionSchema), supplierTransactionController.update)
  .delete(authenticateToken, supplierTransactionController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, supplierTransactionController.restore)
;



export default router;
