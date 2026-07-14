import asyncHandler from "../../../utils/asyncHandler.js";
import securityEventService from "./security-event.service.js";

class SecurityEventController {
  listForUser = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const events = await securityEventService.listForUser(brandId, req.params.userId, Number(req.query.limit) || 50);
    res.json({ success: true, data: events });
  });

  listForBrand = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const { eventType = null, success = null, limit } = req.query;
    const events = await securityEventService.listForBrand(brandId, {
      eventType,
      success: success === undefined ? null : success === "true" || success === true,
      limit: Number(limit) || 100,
    });
    res.json({ success: true, data: events });
  });
}

export default new SecurityEventController();
