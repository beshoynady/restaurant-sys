import express from "express";
import preparationSectionController from "../../controllers/kitchen/preparation-section.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createPreparationSectionSchema, updatePreparationSectionSchema } from "../../validation/kitchen/preparation-section.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createPreparationSectionSchema), preparationSectionController.create)
  .get(authenticateToken, preparationSectionController.getAll)
;

router.route("/:id")
  .get(authenticateToken, preparationSectionController.getOne)
  .put(authenticateToken, validate(updatePreparationSectionSchema), preparationSectionController.update)
  .delete(authenticateToken, preparationSectionController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, preparationSectionController.restore)
;



export default router;
