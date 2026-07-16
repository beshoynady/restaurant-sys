import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import budgetService from "./budget.service.js";

class BudgetController extends BaseController {
  constructor() {
    super(budgetService);
  }

  create = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;
    const { budget, lines } = await budgetService.createBudget({
      brand: brandId, branch: req.body.branch ?? branchId ?? null, costCenter: req.body.costCenter ?? null,
      fiscalYear: req.body.fiscalYear, name: req.body.name, notes: req.body.notes,
      lines: req.body.lines, actorId: userId,
    });
    res.status(201).json({ success: true, data: { budget, lines } });
  });

  updateLines = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;
    const result = await budgetService.updateBudgetLines({
      id: req.params.id, brand: brandId, lines: req.body.lines, actorId: userId,
    });
    res.status(200).json({ success: true, data: result });
  });

  submitForApproval = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;
    const budget = await budgetService.submitForApproval({ id: req.params.id, brand: brandId, actorId: userId });
    res.status(200).json({ success: true, data: budget });
  });

  approveBudget = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;
    const budget = await budgetService.approveBudget({ id: req.params.id, brand: brandId, actorId: userId });
    res.status(200).json({ success: true, data: budget });
  });

  rejectBudget = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;
    const budget = await budgetService.rejectBudget({
      id: req.params.id, brand: brandId, actorId: userId, reason: req.body.reason,
    });
    res.status(200).json({ success: true, data: budget });
  });

  createNewVersion = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;
    const budget = await budgetService.createNewVersion({ id: req.params.id, brand: brandId, actorId: userId });
    res.status(201).json({ success: true, data: budget });
  });

  getCurrentBudgetsSummary = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const fiscalYear = Number(req.query.fiscalYear) || new Date().getUTCFullYear();
    const upToMonth = req.query.upToMonth ? Number(req.query.upToMonth) : 12;
    const result = await budgetService.getCurrentBudgetsSummary({
      brand: brandId, branch: req.query.branch, fiscalYear, upToMonth,
    });
    res.status(200).json({ success: true, data: result });
  });

  getBudgetVsActual = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const upToMonth = req.query.upToMonth ? Number(req.query.upToMonth) : 12;
    const result = await budgetService.getBudgetVsActual({ id: req.params.id, brand: brandId, upToMonth });
    res.status(200).json({ success: true, data: result });
  });
}

export default new BudgetController();
