import express from "express";
import productionRecordController from "../../controllers/production/production-record.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createproductionRecordSchema, updateproductionRecordSchema } from "../../validation/production/production-record.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createproductionRecordSchema), productionRecordController.create)
  .get(authenticateToken, productionRecordController.getAll)
;

router.route("/:id")
  .get(authenticateToken, productionRecordController.getOne)
  .put(authenticateToken, validate(updateproductionRecordSchema), productionRecordController.update)
  .delete(authenticateToken, productionRecordController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, productionRecordController.restore)
;



export default router;
