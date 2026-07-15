import asyncHandler from "../../../utils/asyncHandler.js";
import ledgerService from "./ledger.service.js";

/**
 * Financial Reports — General Ledger / Trial Balance / Journal Report. Every method derives
 * `brand` from `req.user.brandId` ONLY, never from the query string — see ledger.service.js's
 * header comment for the cross-tenant read that was previously possible here. `branch` is an
 * optional filter (still implicitly brand-scoped by every underlying query), letting a
 * multi-branch brand's user narrow a report to one branch without being able to escape their own
 * brand's data.
 */
const ledgerController = {
  getAccountLedger: asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const { branch, startDate, endDate, page, limit } = req.query;
    const report = await ledgerService.getAccountLedger({
      brand: brandId, branch, accountId: req.params.accountId, startDate, endDate, page, limit,
    });
    res.status(200).json({ success: true, data: report });
  }),

  getTrialBalance: asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const { branch, startDate, endDate } = req.query;
    const report = await ledgerService.getTrialBalance({ brand: brandId, branch, startDate, endDate });
    res.status(200).json({ success: true, data: report });
  }),

  getJournalReport: asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const { branch, startDate, endDate, sourceType, page, limit } = req.query;
    const report = await ledgerService.getJournalReport({
      brand: brandId, branch, startDate, endDate, sourceType, page, limit,
    });
    res.status(200).json({ success: true, data: report });
  }),
};

export default ledgerController;
