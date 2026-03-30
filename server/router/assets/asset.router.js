import express from "express";
import assetController from "../../controllers/assets/asset.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createassetSchema, updateassetSchema } from "../../validation/assets/asset.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createassetSchema), assetController.create)
  .get(authenticateToken, assetController.getAll)
;

router.route("/:id")
  .get(authenticateToken, assetController.getOne)
  .put(authenticateToken, validate(updateassetSchema), assetController.update)
  .delete(authenticateToken, assetController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, assetController.restore)
;



export default router;
