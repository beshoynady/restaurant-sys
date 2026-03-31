import express from "express";
import branchController from "../../controllers/core/branch.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createBranchSchema, updateBranchSchema } from "../../validation/core/branch.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createBranchSchema), branchController.create)
  .get(authenticateToken, branchController.getAll)
;

router.route("/:id")
  .get(authenticateToken, branchController.getOne)
  .put(authenticateToken, validate(updateBranchSchema), branchController.update)
  .delete(authenticateToken, branchController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, branchController.restore)
;



export default router;
