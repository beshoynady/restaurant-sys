import express from "express";
import supplierController from "../../controllers/purchasing/supplier.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createsupplierSchema, updatesupplierSchema } from "../../validation/purchasing/supplier.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createsupplierSchema), supplierController.create)
  .get(authenticateToken, supplierController.getAll)
;

router.route("/:id")
  .get(authenticateToken, supplierController.getOne)
  .put(authenticateToken, validate(updatesupplierSchema), supplierController.update)
  .delete(authenticateToken, supplierController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, supplierController.restore)
;



export default router;
