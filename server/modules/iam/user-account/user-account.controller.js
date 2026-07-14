import BaseController from "../../../utils/BaseController.js";
import userAccountService from "./user-account.service.js";
import asyncHandler from "../../../utils/asyncHandler.js";

class UserAccountController extends BaseController {
  constructor() {
    super(userAccountService);
  }

  create = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;

    const result = await userAccountService.create({
      brandId,
      branchId,
      data: req.body,
      createdBy: userId,
    });

    res.status(201).json({ success: true, data: result });
  });

  update = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;

    const result = await userAccountService.update({
      id: req.params.id,
      brandId,
      branchId,
      data: req.body,
      updatedBy: userId,
    });

    res.json({ success: true, data: result });
  });

  // IAM Platform Redesign: BaseController's default hardDelete doesn't pass an acting-user id at
  // all (only softDelete does) — userAccountService.hardDelete() needs one for its "cannot delete
  // yourself" guard, so this override supplies it explicitly.
  hardDelete = asyncHandler(async (req, res) => {
    const { brandId, branchId, userId } = req.user;

    await userAccountService.hardDelete({
      id: req.params.id,
      brandId,
      branchId,
      actorId: userId,
    });

    res.json({ success: true, message: "Deleted permanently" });
  });
}

export default new UserAccountController();
