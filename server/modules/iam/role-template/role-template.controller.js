import asyncHandler from "../../../utils/asyncHandler.js";
import roleTemplateService from "./role-template.service.js";

class RoleTemplateController {
  list = asyncHandler(async (req, res) => {
    const templates = await roleTemplateService.listTemplates();
    res.json({ success: true, data: templates });
  });

  instantiate = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;
    const role = await roleTemplateService.instantiate({
      templateKey: req.body.templateKey,
      scopeOverride: req.body.scopeOverride,
      brand: brandId,
      createdBy: userId,
    });
    res.status(201).json({ success: true, data: role });
  });
}

export default new RoleTemplateController();
