import express from "express";
import assetDisposalController from "./asset-disposal.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  scrapAssetSchema, sellAssetSchema, paramsAssetDisposalSchema, queryAssetDisposalSchema,
} from "./asset-disposal.validation.js";

const router = express.Router();

// ScrapAsset / SellAsset — the two disposal business operations. Both create the disposal record
// AND transition Asset.status atomically; there is no separate generic "create" endpoint for this
// resource, since a disposal is never a bare data-entry action.
router.post(
  "/scrap",
  authenticateToken, authorize("AssetDisposals", "create"), checkModuleEnabled("assets"),
  validate(scrapAssetSchema), assetDisposalController.scrapAsset,
);

router.post(
  "/sell",
  authenticateToken, authorize("AssetDisposals", "create"), checkModuleEnabled("assets"),
  validate(sellAssetSchema), assetDisposalController.sellAsset,
);

router.get(
  "/",
  authenticateToken, authorize("AssetDisposals", "read"), checkModuleEnabled("assets"),
  validate(queryAssetDisposalSchema), assetDisposalController.getAll,
);

router.get(
  "/:id",
  authenticateToken, authorize("AssetDisposals", "read"), checkModuleEnabled("assets"),
  validate(paramsAssetDisposalSchema, "params"), assetDisposalController.getOne,
);

export default router;
