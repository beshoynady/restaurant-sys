import express from "express";
import assetController from "./asset.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
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
  .post(authenticateToken,
    authorize("Assets", "create"),
    checkModuleEnabled("assets"), validate(createAssetSchema), assetController.create)
  .get(authenticateToken,
    authorize("Assets", "read"),
    checkModuleEnabled("assets"), validate(queryAssetSchema), assetController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("Assets", "read"),
    checkModuleEnabled("assets"), validate(paramsAssetSchema), assetController.getOne)
  .put(authenticateToken,
    authorize("Assets", "update"),
    checkModuleEnabled("assets"), validate(updateAssetSchema), assetController.update)
  .delete(authenticateToken,
    authorize("Assets", "delete"),
    checkModuleEnabled("assets"), validate(paramsAssetSchema), assetController.hardDelete) // soft delete
;

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("Assets", "delete"),
    checkModuleEnabled("assets"), validate(paramsAssetSchema), assetController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("Assets", "update"),
    checkModuleEnabled("assets"), validate(paramsAssetSchema), assetController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("Assets", "delete"),
    checkModuleEnabled("assets"), validate(paramsAssetIdsSchema), assetController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("Assets", "delete"),
    checkModuleEnabled("assets"),validate(paramsAssetIdsSchema), assetController.bulkSoftDelete);


export default router;
