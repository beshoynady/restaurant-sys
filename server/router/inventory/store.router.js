import express from "express";
import storeController from "../../controllers/inventory/store.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createStoreSchema, 
  updateStoreSchema, 
  paramsStoreSchema, 
  paramsStoreIdsSchema,
  queryStoreSchema 
} from "../../validation/inventory/store.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createStoreSchema), storeController.create)
  .get(authenticateToken, validate(queryStoreSchema), storeController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsStoreSchema), storeController.getOne)
  .put(authenticateToken, validate(updateStoreSchema), storeController.update)
  .delete(authenticateToken, validate(paramsStoreSchema), storeController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsStoreSchema), storeController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsStoreSchema), storeController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsStoreIdsSchema), storeController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsStoreIdsSchema), storeController.bulkSoftDelete);


export default router;
