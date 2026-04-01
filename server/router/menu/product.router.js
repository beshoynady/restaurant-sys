import express from "express";
import productController from "../../controllers/menu/product.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createProductSchema, updateProductSchema, productParamsSchema, productQuerySchema } from "../../validation/menu/product.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createProductSchema), productController.create)
  .get(authenticateToken, validate(productQuerySchema), productController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(productParamsSchema), productController.getOne)
  .put(authenticateToken, validate(updateProductSchema), productController.update)
  .delete(authenticateToken, validate(productParamsSchema), productController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(productParamsSchema), productController.restore)
;

export default router;
