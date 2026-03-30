import express from "express";
import preparationSectionController from "../../controllers/kitchen/preparation-section.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createpreparationSectionSchema, updatepreparationSectionSchema } from "../../validation/kitchen/preparation-section.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createpreparationSectionSchema), preparationSectionController.create)
  .get(authenticateToken, preparationSectionController.getAll)
;

router.route("/:id")
  .get(authenticateToken, preparationSectionController.getOne)
  .put(authenticateToken, validate(updatepreparationSectionSchema), preparationSectionController.update)
  .delete(authenticateToken, preparationSectionController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, preparationSectionController.restore)
;



export default router;
