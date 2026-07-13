import BaseController from "../../../utils/BaseController.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import throwError from "../../../utils/throwError.js";
import payrollItemService from "./payroll-item.service.js";
import { VARIABLE_REGISTRY } from "./payroll-item.domain.js";

class PayrollItemController extends BaseController {
  constructor() {
    super(payrollItemService);
  }

  // Frontend Readiness: the exact variable names/sources a formula/condition
  // builder UI needs — so the frontend never hardcodes this list itself.
  variables = asyncHandler(async (req, res) => {
    res.json({ success: true, data: VARIABLE_REGISTRY });
  });

  // Lets an admin preview a formula's result against sample data WITHOUT
  // saving it — backend-only evaluation, per this module's own mandate
  // that a frontend must never evaluate a formula itself.
  evaluate = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const item = await payrollItemService.findById({ id: req.params.id, brandId });
    const context = req.body?.context;

    if (!context || typeof context !== "object") {
      throwError("A context object of variable values is required", 400);
    }

    const result = payrollItemService.evaluateItem(item, context);
    res.json({ success: true, data: result });
  });
}

export default new PayrollItemController();
