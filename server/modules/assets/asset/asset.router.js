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
    checkModuleEnabled("assets"), validate(paramsAssetSchema, "params"), assetController.getOne)
  .put(authenticateToken,
    authorize("Assets", "update"),
    checkModuleEnabled("assets"), validate(updateAssetSchema), assetController.update)
  .delete(authenticateToken,
    authorize("Assets", "delete"),
    checkModuleEnabled("assets"), validate(paramsAssetSchema, "params"), assetController.hardDelete) // soft delete
;

// PLATFORM_FINAL_AUDIT.md PA-02, corrected: soft-delete/restore/
// bulk-soft-delete removed — Asset already has its own lifecycle status
// (Draft/Active/Suspended/Disposed/Sold); disposal happens via that status,
// not deletion.

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("Assets", "delete"),
    checkModuleEnabled("assets"), validate(paramsAssetIdsSchema), assetController.bulkHardDelete);


export default router;
