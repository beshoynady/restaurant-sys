import express from "express";
import assetController from "./asset.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import validate from "../../../middlewares/validate.js";
import { 
  createAssetSchema, 
  updateAssetSchema, 
  paramsAssetSchema, 
  paramsAssetIdsSchema,
  queryAssetSchema 
} from "./asset.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createAssetSchema), assetController.create)
  .get(authenticateToken, validate(queryAssetSchema), assetController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsAssetSchema), assetController.getOne)
  .put(authenticateToken, validate(updateAssetSchema), assetController.update)
  .delete(authenticateToken, validate(paramsAssetSchema), assetController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken, validate(paramsAssetSchema), assetController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsAssetSchema), assetController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken, validate(paramsAssetIdsSchema), assetController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,validate(paramsAssetIdsSchema), assetController.bulkSoftDelete);


export default router;
