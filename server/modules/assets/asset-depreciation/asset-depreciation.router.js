import express from "express";
import assetDepreciationController from "./asset-depreciation.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createAssetDepreciationSchema,
  updateAssetDepreciationSchema,
  paramsAssetDepreciationSchema,
  paramsAssetDepreciationIdsSchema,
  queryAssetDepreciationSchema,
  generateAssetDepreciationSchema,
} from "./asset-depreciation.validation.js";

const router = express.Router();

// GenerateDepreciationEntries — computes and creates a Draft entry for one asset+period.
router.post("/generate",
  authenticateToken, authorize("AssetDepreciations", "create"), checkModuleEnabled("assets"),
  validate(generateAssetDepreciationSchema), assetDepreciationController.generateForPeriod);

// PostDepreciation — Draft -> Posted, posts the GL entry and updates Asset.accumulatedDepreciation/bookValue.
router.post("/:id/post",
  authenticateToken, authorize("AssetDepreciations", "update"), checkModuleEnabled("assets"),
  validate(paramsAssetDepreciationSchema, "params"), assetDepreciationController.postDepreciation);

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("AssetDepreciations", "create"),
    checkModuleEnabled("assets"), validate(createAssetDepreciationSchema), assetDepreciationController.create)
  .get(authenticateToken,
    authorize("AssetDepreciations", "read"),
    checkModuleEnabled("assets"), validate(queryAssetDepreciationSchema), assetDepreciationController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("AssetDepreciations", "read"),
    checkModuleEnabled("assets"), validate(paramsAssetDepreciationSchema, "params"), assetDepreciationController.getOne)
  .put(authenticateToken,
    authorize("AssetDepreciations", "update"),
    checkModuleEnabled("assets"), validate(updateAssetDepreciationSchema), assetDepreciationController.update)
  .delete(authenticateToken,
    authorize("AssetDepreciations", "delete"),
    checkModuleEnabled("assets"), validate(paramsAssetDepreciationSchema, "params"), assetDepreciationController.hardDelete) // soft delete
;

// PLATFORM_FINAL_AUDIT.md PA-02, corrected: soft-delete/restore/
// bulk-soft-delete removed — transactional document (Draft/Posted).

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("AssetDepreciations", "delete"),
    checkModuleEnabled("assets"), validate(paramsAssetDepreciationIdsSchema), assetDepreciationController.bulkHardDelete);


export default router;
