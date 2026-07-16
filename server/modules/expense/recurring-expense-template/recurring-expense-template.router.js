import express from "express";
import recurringExpenseTemplateController from "./recurring-expense-template.controller.js";
import authenticateToken from "../../../middlewares/authenticate.js";
import authorize from "../../../middlewares/authorize.js";
import checkModuleEnabled from "../../../middlewares/checkModuleEnabled.js";
import validate from "../../../middlewares/validate.js";
import {
  createRecurringExpenseTemplateSchema, updateRecurringExpenseTemplateSchema,
  generateDueOccurrencesSchema, paramsRecurringExpenseTemplateSchema,
  paramsRecurringExpenseTemplateIdsSchema, queryRecurringExpenseTemplateSchema,
} from "./recurring-expense-template.validation.js";

const router = express.Router();

router.route("/")
  .post(authenticateToken, authorize("RecurringExpenseTemplates", "create"), checkModuleEnabled("financial"),
    validate(createRecurringExpenseTemplateSchema), recurringExpenseTemplateController.create)
  .get(authenticateToken, authorize("RecurringExpenseTemplates", "read"), checkModuleEnabled("financial"),
    validate(queryRecurringExpenseTemplateSchema), recurringExpenseTemplateController.getAll);

// Registered before "/:id" so "generate-due" is never captured as an :id param.
router.post(
  "/generate-due",
  authenticateToken, authorize("RecurringExpenseTemplates", "generate"), checkModuleEnabled("financial"),
  validate(generateDueOccurrencesSchema), recurringExpenseTemplateController.generateDueOccurrences,
);

router.route("/:id")
  .get(authenticateToken, authorize("RecurringExpenseTemplates", "read"), checkModuleEnabled("financial"),
    validate(paramsRecurringExpenseTemplateSchema, "params"), recurringExpenseTemplateController.getOne)
  .put(authenticateToken, authorize("RecurringExpenseTemplates", "update"), checkModuleEnabled("financial"),
    validate(updateRecurringExpenseTemplateSchema), recurringExpenseTemplateController.update)
  .delete(authenticateToken, authorize("RecurringExpenseTemplates", "delete"), checkModuleEnabled("financial"),
    validate(paramsRecurringExpenseTemplateSchema, "params"), recurringExpenseTemplateController.hardDelete);

router.patch(
  "/soft-delete/:id",
  authenticateToken, authorize("RecurringExpenseTemplates", "delete"), checkModuleEnabled("financial"),
  validate(paramsRecurringExpenseTemplateSchema, "params"), recurringExpenseTemplateController.softDelete,
);

router.patch(
  "/restore/:id",
  authenticateToken, authorize("RecurringExpenseTemplates", "update"), checkModuleEnabled("financial"),
  validate(paramsRecurringExpenseTemplateSchema, "params"), recurringExpenseTemplateController.restore,
);

router.post(
  "/:id/pause",
  authenticateToken, authorize("RecurringExpenseTemplates", "update"), checkModuleEnabled("financial"),
  validate(paramsRecurringExpenseTemplateSchema, "params"), recurringExpenseTemplateController.pause,
);

router.post(
  "/:id/resume",
  authenticateToken, authorize("RecurringExpenseTemplates", "update"), checkModuleEnabled("financial"),
  validate(paramsRecurringExpenseTemplateSchema, "params"), recurringExpenseTemplateController.resume,
);

router.post(
  "/:id/cancel",
  authenticateToken, authorize("RecurringExpenseTemplates", "update"), checkModuleEnabled("financial"),
  validate(paramsRecurringExpenseTemplateSchema, "params"), recurringExpenseTemplateController.cancelTemplate,
);

router.post(
  "/:id/generate-now",
  authenticateToken, authorize("RecurringExpenseTemplates", "generate"), checkModuleEnabled("financial"),
  validate(paramsRecurringExpenseTemplateSchema, "params"), recurringExpenseTemplateController.generateNow,
);

router.delete(
  "/bulk-delete",
  authenticateToken, authorize("RecurringExpenseTemplates", "delete"), checkModuleEnabled("financial"),
  validate(paramsRecurringExpenseTemplateIdsSchema), recurringExpenseTemplateController.bulkHardDelete,
);

router.patch(
  "/bulk-soft-delete",
  authenticateToken, authorize("RecurringExpenseTemplates", "delete"), checkModuleEnabled("financial"),
  validate(paramsRecurringExpenseTemplateIdsSchema), recurringExpenseTemplateController.bulkSoftDelete,
);

export default router;
