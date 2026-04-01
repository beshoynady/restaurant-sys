import express from "express";
import brandController from "../../controllers/core/brand.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createBrandSchema, 
  updateBrandSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/core/brand.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createBrandSchema), brandController.create)
  .get(authenticateToken, validate(querySchema()), brandController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), brandController.getOne)
  .put(authenticateToken, validate(updateBrandSchema), brandController.update)
  .delete(authenticateToken, validate(paramsSchema()), brandController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), brandController.restore)
;

export default router;
