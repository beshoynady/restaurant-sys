import express from "express";
import cashRegisterController from "../../controllers/cash/cash-register.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { 
  createCashRegisterSchema, 
  updateCashRegisterSchema, 
  paramsSchema, 
  querySchema 
} from "../../validation/cash/cash-register.validation.js";

const router = express.Router();

// Create & GetAll
router.route("/")
  .post(authenticateToken, validate(createCashRegisterSchema), cashRegisterController.create)
  .get(authenticateToken, validate(querySchema()), cashRegisterController.getAll)
;

// GetOne, Update, SoftDelete
router.route("/:id")
  .get(authenticateToken, validate(paramsSchema()), cashRegisterController.getOne)
  .put(authenticateToken, validate(updateCashRegisterSchema), cashRegisterController.update)
  .delete(authenticateToken, validate(paramsSchema()), cashRegisterController.delete) // soft delete
;

// Restore soft-deleted item
router.route("/restore/:id")
  .patch(authenticateToken, validate(paramsSchema()), cashRegisterController.restore)
;

export default router;
