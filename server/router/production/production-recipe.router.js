import express from "express";
import productionRecipeController from "../../controllers/production/production-recipe.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createProductionRecipeSchema, updateProductionRecipeSchema } from "../../validation/production/production-recipe.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createProductionRecipeSchema), productionRecipeController.create)
  .get(authenticateToken, productionRecipeController.getAll)
;

router.route("/:id")
  .get(authenticateToken, productionRecipeController.getOne)
  .put(authenticateToken, validate(updateProductionRecipeSchema), productionRecipeController.update)
  .delete(authenticateToken, productionRecipeController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, productionRecipeController.restore)
;



export default router;
