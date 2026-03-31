import express from "express";
import roleController from "../../controllers/employees/role.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createRoleSchema, updateRoleSchema } from "../../validation/employees/role.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createRoleSchema), roleController.create)
  .get(authenticateToken, roleController.getAll)
;

router.route("/:id")
  .get(authenticateToken, roleController.getOne)
  .put(authenticateToken, validate(updateRoleSchema), roleController.update)
  .delete(authenticateToken, roleController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, roleController.restore)
;



export default router;
