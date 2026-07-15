import asyncHandler from "../../../utils/asyncHandler.js";
import assetReportsService from "./asset-reports.service.js";

const assetReportsController = {
  getAssetRegister: asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const { branch, category, status, page, limit } = req.query;
    const report = await assetReportsService.getAssetRegister({ brand: brandId, branch, category, status, page, limit });
    res.status(200).json({ success: true, data: report });
  }),

  getDepreciationSchedule: asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const { branch } = req.query;
    const report = await assetReportsService.getDepreciationSchedule({ brand: brandId, branch, assetId: req.params.assetId });
    res.status(200).json({ success: true, data: report });
  }),

  getAssetBookValue: asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const { branch, status } = req.query;
    const report = await assetReportsService.getAssetBookValue({ brand: brandId, branch, status });
    res.status(200).json({ success: true, data: report });
  }),
};

export default assetReportsController;
