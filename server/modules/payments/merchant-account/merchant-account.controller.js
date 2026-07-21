import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import merchantAccountService from "./merchant-account.service.js";

class MerchantAccountController extends BaseController {
  constructor() {
    super(merchantAccountService);
  }

  // Every response from this controller goes through toSafeJSON() — secrets are masked, never
  // decrypted, regardless of the caller's RBAC permission (see merchant-account.service.js's own
  // comment: this is a stricter-than-RBAC rule, not a permission check).
  create = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;
    const account = await merchantAccountService.create({
      brandId, createdBy: userId, data: req.body,
    });
    return this.sendResponse(res, { statusCode: 201, message: "Merchant account created", data: merchantAccountService.toSafeJSON(account) });
  });

  update = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;
    const account = await merchantAccountService.update({
      id: req.params.id, brandId, updatedBy: userId, data: req.body,
    });
    return this.sendResponse(res, { message: "Merchant account updated", data: merchantAccountService.toSafeJSON(account) });
  });

  getOne = asyncHandler(async (req, res) => {
    const { brandId, branchId } = req.user;
    const account = await merchantAccountService.findById({ id: req.params.id, brandId, branchId });
    return this.sendResponse(res, { data: merchantAccountService.toSafeJSON(account) });
  });

  getAll = asyncHandler(async (req, res) => {
    const { brandId, branchId } = req.user;
    const { page = 1, limit = 10, search = "", includeDeleted = false, sort, select } = req.query;
    const filters = { ...req.query };
    delete filters.page; delete filters.limit; delete filters.search; delete filters.includeDeleted; delete filters.sort; delete filters.select;

    const result = await merchantAccountService.getAll({
      brandId, branchId, page: Number(page), limit: Number(limit), search, filters, sort, select,
      includeDeleted: includeDeleted === "true",
    });
    return this.sendResponse(res, {
      data: result.data.map((a) => merchantAccountService.toSafeJSON(a)),
      meta: result.pagination,
    });
  });
}

export default new MerchantAccountController();
