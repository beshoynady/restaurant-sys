import asyncHandler from "../../../utils/asyncHandler.js";
import executiveDashboardService from "./executive-dashboard.service.js";

const executiveDashboardController = {
  getBranchFinancialSummary: asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const { startDate, endDate } = req.query;
    const report = await executiveDashboardService.getBranchFinancialSummary({ brand: brandId, startDate, endDate });
    res.status(200).json({ success: true, data: report });
  }),

  getTreasuryDashboard: asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const { branch } = req.query;
    const report = await executiveDashboardService.getTreasuryDashboard({ brand: brandId, branch });
    res.status(200).json({ success: true, data: report });
  }),

  getExecutiveDashboard: asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const { branch, startDate, endDate } = req.query;
    const report = await executiveDashboardService.getExecutiveDashboard({ brand: brandId, branch, startDate, endDate });
    res.status(200).json({ success: true, data: report });
  }),

  getFinancialKPIs: asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const { branch, startDate, endDate } = req.query;
    const report = await executiveDashboardService.getFinancialKPIs({ brand: brandId, branch, startDate, endDate });
    res.status(200).json({ success: true, data: report });
  }),
};

export default executiveDashboardController;
