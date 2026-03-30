import express from "express";
import dailyExpenseController from "../../controllers/expenses/daily-expense.controller.js";
import { authenticateToken } from "../../middlewares/authenticate.js";
import validate from "../../middlewares/validate.js";
import { createdailyExpenseSchema, updatedailyExpenseSchema } from "../../validation/expenses/daily-expense.validation.js";


const router = express.Router();

router.route("/")
  .post(authenticateToken, validate(createdailyExpenseSchema), dailyExpenseController.create)
  .get(authenticateToken, dailyExpenseController.getAll)
;

router.route("/:id")
  .get(authenticateToken, dailyExpenseController.getOne)
  .put(authenticateToken, validate(updatedailyExpenseSchema), dailyExpenseController.update)
  .delete(authenticateToken, dailyExpenseController.delete)
;

router.route("/restore/:id")
  .patch(authenticateToken, dailyExpenseController.restore)
;



export default router;
