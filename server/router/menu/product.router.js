import express from "express";
import productController from "../../controllers/menu/product.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createProductSchema, updateProductSchema } from "../../validation/menu/product.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createProductSchema), productController.create)
  .get(authenticateToken, productController.getAll)
;

router.route("/:id")
  .get(authenticateToken, productController.getOne)
  .put(authenticateToken, validate(updateProductSchema), productController.update)
  .delete(authenticateToken, productController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, productController.restore)
;



export default router;
