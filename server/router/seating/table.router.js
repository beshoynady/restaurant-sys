import express from "express";
import tableController from "../../controllers/seating/table.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createTableSchema, updateTableSchema } from "../../validation/seating/table.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createTableSchema), tableController.create)
  .get(authenticateToken, tableController.getAll)
;

router.route("/:id")
  .get(authenticateToken, tableController.getOne)
  .put(authenticateToken, validate(updateTableSchema), tableController.update)
  .delete(authenticateToken, tableController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, tableController.restore)
;



export default router;
