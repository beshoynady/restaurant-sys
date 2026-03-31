import express from "express";
import onlineCustomerController from "../../controllers/customers/online-customer.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createOnlineCustomerSchema, updateOnlineCustomerSchema } from "../../validation/customers/online-customer.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createOnlineCustomerSchema), onlineCustomerController.create)
  .get(authenticateToken, onlineCustomerController.getAll)
;

router.route("/:id")
  .get(authenticateToken, onlineCustomerController.getOne)
  .put(authenticateToken, validate(updateOnlineCustomerSchema), onlineCustomerController.update)
  .delete(authenticateToken, onlineCustomerController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, onlineCustomerController.restore)
;



export default router;
