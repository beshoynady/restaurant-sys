import asyncHandler from "../../../utils/asyncHandler.js";
import financialStatementsService from "./financial-statements.service.js";

// Same tenant-scoping discipline as ledger.controller.js — `brand` always from req.user, never
// from the query string.
const financialStatementsController = {
  getBalanceSheet: asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const { branch, asOfDate } = req.query;
    const report = await financialStatementsService.getBalanceSheet({ brand: brandId, branch, asOfDate });
    res.status(200).json({ success: true, data: report });
  }),

  getIncomeStatement: asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const { branch, startDate, endDate } = req.query;
    const report = await financialStatementsService.getIncomeStatement({ brand: brandId, branch, startDate, endDate });
    res.status(200).json({ success: true, data: report });
  }),

  getCashFlowStatement: asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const { branch, startDate, endDate } = req.query;
    const report = await financialStatementsService.getCashFlowStatement({ brand: brandId, branch, startDate, endDate });
    res.status(200).json({ success: true, data: report });
  }),
};

export default financialStatementsController;
