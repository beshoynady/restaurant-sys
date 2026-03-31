import express from "express";
import assetCategoryController from "../../controllers/assets/asset-category.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createAssetCategorySchema, updateAssetCategorySchema } from "../../validation/assets/asset-category.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createAssetCategorySchema), assetCategoryController.create)
  .get(authenticateToken, assetCategoryController.getAll)
;

router.route("/:id")
  .get(authenticateToken, assetCategoryController.getOne)
  .put(authenticateToken, validate(updateAssetCategorySchema), assetCategoryController.update)
  .delete(authenticateToken, assetCategoryController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, assetCategoryController.restore)
;



export default router;
