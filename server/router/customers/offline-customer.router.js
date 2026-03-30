import express from "express";
import offlineCustomerController from "../../controllers/customers/offline-customer.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createofflineCustomerSchema, updateofflineCustomerSchema } from "../../validation/customers/offline-customer.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createofflineCustomerSchema), offlineCustomerController.create)
  .get(authenticateToken, offlineCustomerController.getAll)
;

router.route("/:id")
  .get(authenticateToken, offlineCustomerController.getOne)
  .put(authenticateToken, validate(updateofflineCustomerSchema), offlineCustomerController.update)
  .delete(authenticateToken, offlineCustomerController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, offlineCustomerController.restore)
;



export default router;
