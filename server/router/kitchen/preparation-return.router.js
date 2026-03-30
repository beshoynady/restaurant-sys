import express from "express";
import preparationReturnController from "../../controllers/kitchen/preparation-return.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createpreparationReturnSchema, updatepreparationReturnSchema } from "../../validation/kitchen/preparation-return.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createpreparationReturnSchema), preparationReturnController.create)
  .get(authenticateToken, preparationReturnController.getAll)
;

router.route("/:id")
  .get(authenticateToken, preparationReturnController.getOne)
  .put(authenticateToken, validate(updatepreparationReturnSchema), preparationReturnController.update)
  .delete(authenticateToken, preparationReturnController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, preparationReturnController.restore)
;



export default router;
