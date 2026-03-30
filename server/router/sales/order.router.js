import express from "express";
import orderController from "../../controllers/sales/order.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createorderSchema, updateorderSchema } from "../../validation/sales/order.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createorderSchema), orderController.create)
  .get(authenticateToken, orderController.getAll)
;

router.route("/:id")
  .get(authenticateToken, orderController.getOne)
  .put(authenticateToken, validate(updateorderSchema), orderController.update)
  .delete(authenticateToken, orderController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, orderController.restore)
;



export default router;
