import express from "express";
import assetTransactionsController from "./asset-transactions.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import { 
  createAssetTransactionsSchema, 
  updateAssetTransactionsSchema, 
  paramsAssetTransactionsSchema, 
  paramsAssetTransactionsIdsSchema,
  queryAssetTransactionsSchema 
} from "./asset-transactions.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken,
    authorize("AssetTransactions", "create"),
    checkModuleEnabled("assets"), validate(createAssetTransactionsSchema), assetTransactionsController.create)
  .get(authenticateToken,
    authorize("AssetTransactions", "read"),
    checkModuleEnabled("assets"), validate(queryAssetTransactionsSchema), assetTransactionsController.getAll)
;

// GetOne, Update, hardDelete
router.route("/:id")
  .get(authenticateToken,
    authorize("AssetTransactions", "read"),
    checkModuleEnabled("assets"), validate(paramsAssetTransactionsSchema, "params"), assetTransactionsController.getOne)
  .put(authenticateToken,
    authorize("AssetTransactions", "update"),
    checkModuleEnabled("assets"), validate(updateAssetTransactionsSchema), assetTransactionsController.update)
  .delete(authenticateToken,
    authorize("AssetTransactions", "delete"),
    checkModuleEnabled("assets"), validate(paramsAssetTransactionsSchema, "params"), assetTransactionsController.hardDelete) // soft delete
;

// PLATFORM_FINAL_AUDIT.md PA-02, corrected: soft-delete/restore/
// bulk-soft-delete removed — AssetTransaction is an immutable audit log by
// design (the model itself now blocks updateOne/findOneAndUpdate/deleteOne).
// The remaining hardDelete/bulkHardDelete routes below stay reachable but
// will always fail against the model's own guard — left as-is rather than
// also removed, so the failure is explicit (from the model) instead of
// silently absent from the API surface.

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("AssetTransactions", "delete"),
    checkModuleEnabled("assets"), validate(paramsAssetTransactionsIdsSchema), assetTransactionsController.bulkHardDelete);


export default router;
