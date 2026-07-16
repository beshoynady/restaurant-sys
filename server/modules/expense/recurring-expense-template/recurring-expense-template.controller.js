import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import recurringExpenseTemplateService from "./recurring-expense-template.service.js";

class RecurringExpenseTemplateController extends BaseController {
  constructor() {
    super(recurringExpenseTemplateService);
  }

  pause = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const template = await recurringExpenseTemplateService.pause({ id: req.params.id, brand: brandId, branch: branchId, actorId: userId });
    res.status(200).json({ success: true, data: template });
  });

  resume = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const template = await recurringExpenseTemplateService.resume({ id: req.params.id, brand: brandId, branch: branchId, actorId: userId });
    res.status(200).json({ success: true, data: template });
  });

  cancelTemplate = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const template = await recurringExpenseTemplateService.cancelTemplate({ id: req.params.id, brand: brandId, branch: branchId, actorId: userId });
    res.status(200).json({ success: true, data: template });
  });

  generateDueOccurrences = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const asOfDate = req.body.asOfDate ? new Date(req.body.asOfDate) : new Date();
    const results = await recurringExpenseTemplateService.generateDueOccurrences({
      brand: brandId, branch: req.body.branch ?? branchId ?? null, asOfDate, actorId: userId,
    });
    res.status(200).json({ success: true, data: results });
  });

  generateNow = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const dailyExpense = await recurringExpenseTemplateService.generateNow({ id: req.params.id, brand: brandId, branch: branchId, actorId: userId });
    res.status(201).json({ success: true, data: dailyExpense });
  });
}

export default new RecurringExpenseTemplateController();
