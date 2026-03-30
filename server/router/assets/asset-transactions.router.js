import express from "express";
import assetTransactionsController from "../../controllers/assets/asset-transactions.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createassetTransactionsSchema, updateassetTransactionsSchema } from "../../validation/assets/asset-transactions.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createassetTransactionsSchema), assetTransactionsController.create)
  .get(authenticateToken, assetTransactionsController.getAll)
;

router.route("/:id")
  .get(authenticateToken, assetTransactionsController.getOne)
  .put(authenticateToken, validate(updateassetTransactionsSchema), assetTransactionsController.update)
  .delete(authenticateToken, assetTransactionsController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, assetTransactionsController.restore)
;



export default router;
