import asyncHandler from "../../../utils/asyncHandler.js";
import financeReportsService from "./finance-reports.service.js";

const financeReportsController = {
  getCashRegisterReport: asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const { branch, registerId, startDate, endDate } = req.query;
    const report = await financeReportsService.getCashRegisterReport({ brand: brandId, branch, registerId, startDate, endDate });
    res.status(200).json({ success: true, data: report });
  }),

  getCashRegisterTransactions: asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const { branch, startDate, endDate, page, limit } = req.query;
    const report = await financeReportsService.getCashRegisterTransactions({
      brand: brandId, branch, registerId: req.params.registerId, startDate, endDate, page, limit,
    });
    res.status(200).json({ success: true, data: report });
  }),

  getBankAccountReport: asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const { branch, bankAccountId, startDate, endDate } = req.query;
    const report = await financeReportsService.getBankAccountReport({ brand: brandId, branch, bankAccountId, startDate, endDate });
    res.status(200).json({ success: true, data: report });
  }),

  getCashierShiftReport: asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const { branch, cashier, register, status, startDate, endDate, page, limit } = req.query;
    const report = await financeReportsService.getCashierShiftReport({
      brand: brandId, branch, cashier, register, status, startDate, endDate, page, limit,
    });
    res.status(200).json({ success: true, data: report });
  }),
};

export default financeReportsController;
