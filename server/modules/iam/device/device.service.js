import DeviceModel from "./device.model.js";
import throwError from "../../../utils/throwError.js";
import securityEventService from "../security-event/security-event.service.js";

class DeviceService {
  /**
   * IAP V2.0 Milestone 3 — called on every login that supplies a `deviceFingerprint`. Finds the
   * existing Device for this (brand, fingerprint) or registers a new one, and refreshes its
   * "last seen" snapshot. Never creates a duplicate for the same fingerprint — a device's
   * identity persists across every login it's used for, which is the entire point (trust/block
   * decisions need something stable to attach to).
   */
  async findOrRegister({ brand, fingerprint, deviceType, browser, os, ipAddress, userId, createdBy }) {
    if (!fingerprint) return null;

    // `rawResult` is the only reliable way to tell "just created" from "matched existing" out of
    // a single atomic upsert — a second read-then-compare would reopen the same race this atomic
    // upsert exists to close.
    const raw = await DeviceModel.findOneAndUpdate(
      { brand, fingerprint },
      {
        $set: {
          lastUser: userId,
          lastIP: ipAddress || null,
          lastSeenAt: new Date(),
          ...(browser ? { browser } : {}),
          ...(os ? { os } : {}),
        },
        $setOnInsert: {
          brand,
          fingerprint,
          deviceType: deviceType || "UNKNOWN",
          trusted: false,
          blocked: false,
          createdBy: createdBy || null,
        },
      },
      { new: true, upsert: true, includeResultMetadata: true },
    );

    const device = raw.value;
    if (raw.lastErrorObject?.upserted) {
      await securityEventService.record({
        brand, user: userId, device: device._id, eventType: "DEVICE_REGISTERED", success: true, ipAddress,
      });
    }

    return device;
  }

  async trust({ id, brand, updatedBy }) {
    const device = await DeviceModel.findOneAndUpdate(
      { _id: id, brand },
      { $set: { trusted: true, blocked: false, blockedReason: null } },
      { new: true },
    );
    if (!device) throwError("Device not found.", 404);
    await securityEventService.record({ brand, device: device._id, user: updatedBy || null, eventType: "DEVICE_TRUSTED", success: true });
    return device;
  }

  async block({ id, brand, reason = null, updatedBy = null }) {
    const device = await DeviceModel.findOneAndUpdate(
      { _id: id, brand },
      { $set: { blocked: true, blockedReason: reason, trusted: false } },
      { new: true },
    );
    if (!device) throwError("Device not found.", 404);
    await securityEventService.record({ brand, device: device._id, user: updatedBy || null, eventType: "DEVICE_BLOCKED", success: true, reason });
    return device;
  }

  async rename({ id, brand, deviceName }) {
    const device = await DeviceModel.findOneAndUpdate(
      { _id: id, brand },
      { $set: { deviceName } },
      { new: true },
    );
    if (!device) throwError("Device not found.", 404);
    return device;
  }

  async listForUser(brand, userId) {
    return DeviceModel.find({ brand, lastUser: userId }).sort({ lastSeenAt: -1 }).lean();
  }

  async findById(id, brand) {
    return DeviceModel.findOne({ _id: id, brand });
  }
}

export default new DeviceService();
