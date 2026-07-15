import asyncHandler from "../../../utils/asyncHandler.js";
import expenseReportsService from "./expense-reports.service.js";

const expenseReportsController = {
  getExpenseAnalysis: asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const { branch, costCenter, startDate, endDate } = req.query;
    const report = await expenseReportsService.getExpenseAnalysis({ brand: brandId, branch, costCenter, startDate, endDate });
    res.status(200).json({ success: true, data: report });
  }),

  getExpenseDetail: asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const { branch, costCenter, startDate, endDate, page, limit } = req.query;
    const report = await expenseReportsService.getExpenseDetail({ brand: brandId, branch, costCenter, startDate, endDate, page, limit });
    res.status(200).json({ success: true, data: report });
  }),
};

export default expenseReportsController;
