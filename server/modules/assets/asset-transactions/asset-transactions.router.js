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

router.route("/soft-delete/:id")
  .patch(authenticateToken,
    authorize("AssetTransactions", "delete"),
    checkModuleEnabled("assets"), validate(paramsAssetTransactionsSchema, "params"), assetTransactionsController.softDelete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken,
    authorize("AssetTransactions", "update"),
    checkModuleEnabled("assets"), validate(paramsAssetTransactionsSchema, "params"), assetTransactionsController.restore)
;

 // --- BULK HARD DELETE ---
  router.route("/bulk-delete")
    .delete(authenticateToken,
    authorize("AssetTransactions", "delete"),
    checkModuleEnabled("assets"), validate(paramsAssetTransactionsIdsSchema), assetTransactionsController.bulkHardDelete);


  // --- BULK SOFT DELETE ---
  router.route("/bulk-soft-delete")
    .patch(authenticateToken,
    authorize("AssetTransactions", "delete"),
    checkModuleEnabled("assets"),validate(paramsAssetTransactionsIdsSchema), assetTransactionsController.bulkSoftDelete);


export default router;
