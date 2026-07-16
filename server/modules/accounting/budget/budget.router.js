import express from "express";
import budgetController from "./budget.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createBudgetSchema, updateBudgetLinesSchema, rejectBudgetSchema, budgetVsActualQuerySchema,
  budgetsSummaryQuerySchema, paramsBudgetSchema, queryBudgetSchema,
} from "./budget.validation.js";

const router = express.Router();

router.post(
  "/",
  authenticateToken, authorize("Budgets", "create"), checkModuleEnabled("accounting"),
  validate(createBudgetSchema), budgetController.create,
);

router.put(
  "/:id/lines",
  authenticateToken, authorize("Budgets", "update"), checkModuleEnabled("accounting"),
  validate(paramsBudgetSchema, "params"), validate(updateBudgetLinesSchema), budgetController.updateLines,
);

router.post(
  "/:id/submit",
  authenticateToken, authorize("Budgets", "update"), checkModuleEnabled("accounting"),
  validate(paramsBudgetSchema, "params"), budgetController.submitForApproval,
);

router.post(
  "/:id/approve",
  authenticateToken, authorize("Budgets", "approve"), checkModuleEnabled("accounting"),
  validate(paramsBudgetSchema, "params"), budgetController.approveBudget,
);

router.post(
  "/:id/reject",
  authenticateToken, authorize("Budgets", "approve"), checkModuleEnabled("accounting"),
  validate(paramsBudgetSchema, "params"), validate(rejectBudgetSchema), budgetController.rejectBudget,
);

router.post(
  "/:id/new-version",
  authenticateToken, authorize("Budgets", "update"), checkModuleEnabled("accounting"),
  validate(paramsBudgetSchema, "params"), budgetController.createNewVersion,
);

// Registered before "/:id" so "summary" is never captured as an :id param.
router.get(
  "/summary",
  authenticateToken, authorize("Budgets", "read"), checkModuleEnabled("accounting"),
  validate(budgetsSummaryQuerySchema, "query"), budgetController.getCurrentBudgetsSummary,
);

router.get(
  "/:id/vs-actual",
  authenticateToken, authorize("Budgets", "read"), checkModuleEnabled("accounting"),
  validate(paramsBudgetSchema, "params"), validate(budgetVsActualQuerySchema, "query"), budgetController.getBudgetVsActual,
);

router.get(
  "/",
  authenticateToken, authorize("Budgets", "read"), checkModuleEnabled("accounting"),
  validate(queryBudgetSchema), budgetController.getAll,
);

router.get(
  "/:id",
  authenticateToken, authorize("Budgets", "read"), checkModuleEnabled("accounting"),
  validate(paramsBudgetSchema, "params"), budgetController.getOne,
);

export default router;
