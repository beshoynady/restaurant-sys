import express from "express";
import costCenterController from "../../controllers/accounting/cost-center.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createcostCenterSchema, updatecostCenterSchema } from "../../validation/accounting/cost-center.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createcostCenterSchema), costCenterController.create)
  .get(authenticateToken, costCenterController.getAll)
;

router.route("/:id")
  .get(authenticateToken, costCenterController.getOne)
  .put(authenticateToken, validate(updatecostCenterSchema), costCenterController.update)
  .delete(authenticateToken, costCenterController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, costCenterController.restore)
;



export default router;
