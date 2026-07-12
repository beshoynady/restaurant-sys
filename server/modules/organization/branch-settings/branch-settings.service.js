// Service layer (BACKEND_FOUNDATION.md §4.3): business orchestration + business rules only — zero
// raw Mongoose calls.
//
// The operating-hours calculations below (isBranchOpen/isServiceAvailable/getCurrentPeriod/
// getNextOpenTime/isWithinTime) are genuine business logic — real invariants about what "open"
// means for a branch.
import throwError from "../../../utils/throwError.js";
import BranchSettingsRepository from "./branch-settings.repository.js";

class BranchSettingsService extends BranchSettingsRepository {
  // Prevent duplicate settings doc per branch.
  async create({ brandId, branchId, data, createdBy }) {
    const exists = await this.findByBranch(data.branch);
    if (exists) throwError("Settings already exist for this branch", 400);

    return super.create({ brandId, branchId, data, createdBy });
  }

  async getByBranch({ branchId, brandId = null }) {
    const settings = await this.findByBranch(branchId, brandId);
    if (!settings) throwError("Branch settings not found", 404);
    return settings;
  }

  // Upsert — important for the frontend settings screen.
  async upsert({ brandId, branchId, data, userId }) {
    const existing = await this.findOneByBrandAndBranch(brandId, branchId);

    if (existing) {
      return this.update({
        id: String(existing._id),
        brandId,
        branchId,
        data,
        updatedBy: userId,
      });
    }

    return this.create({
      brandId,
      branchId,
      data: { ...data, branch: branchId },
      createdBy: userId,
    });
  }

  async isBranchOpen({ branchId, brandId = null }) {
    const settings = await this.getByBranch({ branchId, brandId });

    const now = new Date();
    const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
    const currentTime = now.toTimeString().slice(0, 5);

    const today = settings.operatingHours.find((d) => d.day === dayName);
    if (today?.status !== "open") return false;

    for (const period of today.periods) {
      if (this.isWithinTime(currentTime, period.openTime, period.closeTime)) {
        const inPause = period.pauses?.some((p) => this.isWithinTime(currentTime, p.from, p.to));
        if (!inPause) return true;
      }
    }

    return false;
  }

  async isServiceAvailable({ branchId, brandId = null, serviceType }) {
    const allowed = ["dineIn", "takeaway", "delivery"];
    if (!allowed.includes(serviceType)) throwError("Invalid service type", 400);

    const settings = await this.getByBranch({ branchId, brandId });

    const now = new Date();
    const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
    const currentTime = now.toTimeString().slice(0, 5);

    const today = settings.operatingHours.find((d) => d.day === dayName);
    if (today?.status !== "open") return false;

    for (const period of today.periods) {
      const service = period.services?.[serviceType];
      if (!service?.enabled) continue;

      const open = service.openTime ?? period.openTime;
      const close = service.closeTime ?? period.closeTime;

      if (this.isWithinTime(currentTime, open, close)) {
        const inPause = period.pauses?.some((p) => this.isWithinTime(currentTime, p.from, p.to));
        if (!inPause) return true;
      }
    }

    return false;
  }

  async getCurrentPeriod({ branchId, brandId = null }) {
    const settings = await this.getByBranch({ branchId, brandId });

    const now = new Date();
    const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
    const currentTime = now.toTimeString().slice(0, 5);

    const today = settings.operatingHours.find((d) => d.day === dayName);
    if (!today) return null;

    return today.periods.find((p) => this.isWithinTime(currentTime, p.openTime, p.closeTime)) ?? null;
  }

  async getNextOpenTime({ branchId, brandId = null }) {
    const settings = await this.getByBranch({ branchId, brandId });
    const now = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(now.getDate() + i);
      const dayName = date.toLocaleDateString("en-US", { weekday: "long" });

      const day = settings.operatingHours.find((d) => d.day === dayName);
      if (day?.status !== "open") continue;

      if (day.periods.length) {
        return { day: dayName, time: day.periods[0].openTime };
      }
    }

    return null;
  }

  isWithinTime(current, start, end) {
    if (!start || !end) return false;
    if (start <= end) return current >= start && current <= end;
    return current >= start || current <= end;
  }
}

export default new BranchSettingsService();
