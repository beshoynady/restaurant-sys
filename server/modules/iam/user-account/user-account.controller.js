import BaseController from "../../../utils/BaseController.js";
import userAccountService from "./user-account.service.js";
import asyncHandler from "../../../utils/asyncHandler.js";

class UserAccountController extends BaseController {
  constructor() {
    super(userAccountService);
  }

  create = asyncHandler(async (req, res) => {
    const result = await this.service.create(req.body, req.user);
    res.status(201).json(result);
  });

  update = asyncHandler(async (req, res) => {
    const result = await this.service.update(
      req.params.id,
      req.body,
      req.user
    );
    res.json(result);
  });

  softDelete = asyncHandler(async (req, res) => {
    const result = await this.service.softDelete(
      req.params.id,
      req.user
    );
    res.json(result);
  });
}

export default new UserAccountController();