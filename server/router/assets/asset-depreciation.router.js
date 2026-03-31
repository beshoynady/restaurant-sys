import express from "express";
import assetDepreciationController from "../../controllers/assets/asset-depreciation.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createAssetDepreciationSchema, updateAssetDepreciationSchema } from "../../validation/assets/asset-depreciation.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createAssetDepreciationSchema), assetDepreciationController.create)
  .get(authenticateToken, assetDepreciationController.getAll)
;

router.route("/:id")
  .get(authenticateToken, assetDepreciationController.getOne)
  .put(authenticateToken, validate(updateAssetDepreciationSchema), assetDepreciationController.update)
  .delete(authenticateToken, assetDepreciationController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, assetDepreciationController.restore)
;



export default router;
