import express from "express";
import diningAreaController from "../../controllers/seating/dining-area.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createDiningAreaSchema, updateDiningAreaSchema, diningAreaParamsSchema, diningAreaQuerySchema } from "../../validation/seating/dining-area.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createDiningAreaSchema), diningAreaController.create)
  .get(authenticateToken, validate(diningAreaQuerySchema), diningAreaController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(diningAreaParamsSchema), diningAreaController.getOne)
  .put(authenticateToken, validate(updateDiningAreaSchema), diningAreaController.update)
  .delete(authenticateToken, validate(diningAreaParamsSchema), diningAreaController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(diningAreaParamsSchema), diningAreaController.restore)
;

export default router;
