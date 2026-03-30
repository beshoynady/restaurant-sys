import express from "express";
import recipeController from "../../controllers/menu/recipe.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createrecipeSchema, updaterecipeSchema } from "../../validation/menu/recipe.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createrecipeSchema), recipeController.create)
  .get(authenticateToken, recipeController.getAll)
;

router.route("/:id")
  .get(authenticateToken, recipeController.getOne)
  .put(authenticateToken, validate(updaterecipeSchema), recipeController.update)
  .delete(authenticateToken, recipeController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, recipeController.restore)
;



export default router;
