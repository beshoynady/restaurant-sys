import express from "express";
import purchaseInvoiceController from "../../controllers/purchasing/purchase-invoice.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createpurchaseInvoiceSchema, updatepurchaseInvoiceSchema } from "../../validation/purchasing/purchase-invoice.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createpurchaseInvoiceSchema), purchaseInvoiceController.create)
  .get(authenticateToken, purchaseInvoiceController.getAll)
;

router.route("/:id")
  .get(authenticateToken, purchaseInvoiceController.getOne)
  .put(authenticateToken, validate(updatepurchaseInvoiceSchema), purchaseInvoiceController.update)
  .delete(authenticateToken, purchaseInvoiceController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, purchaseInvoiceController.restore)
;



export default router;
