import asyncHandler from "../../../utils/asyncHandler.js";
import deviceService from "./device.service.js";
import sessionService from "../session/session.service.js";

class DeviceController {
  listForUser = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const devices = await deviceService.listForUser(brandId, req.params.userId);
    res.json({ success: true, data: devices });
  });

  trust = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;
    const device = await deviceService.trust({ id: req.params.id, brand: brandId, updatedBy: userId });
    res.json({ success: true, data: device });
  });

  // IAP V2.0 Milestone 3: blocking a device also revokes every active session tied to it — a
  // blocked device shouldn't keep an already-issued session alive.
  block = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;
    const device = await deviceService.block({ id: req.params.id, brand: brandId, reason: req.body.reason, updatedBy: userId });
    await sessionService.revokeAllForDevice(device._id, "ADMIN_REVOKED");
    res.json({ success: true, data: device });
  });

  rename = asyncHandler(async (req, res) => {
    const { brandId } = req.user;
    const device = await deviceService.rename({ id: req.params.id, brand: brandId, deviceName: req.body.deviceName });
    res.json({ success: true, data: device });
  });
}

export default new DeviceController();
