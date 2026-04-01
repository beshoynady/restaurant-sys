import express from "express";
import storeController from "../../controllers/inventory/store.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createStoreSchema, 
  updateStoreSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/inventory/store.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createStoreSchema), storeController.create)
  .get(authenticateToken, validate(querySchema()), storeController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), storeController.getOne)
  .put(authenticateToken, validate(updateStoreSchema), storeController.update)
  .delete(authenticateToken, validate(paramsSchema()), storeController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), storeController.restore)
;

export default router;
