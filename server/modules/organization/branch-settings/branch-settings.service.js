import BaseService from "../../../utils/BaseService.js";
import BranchSettingsModel from "../../models/core/branch-settings.model.js";
import throwError from "../../../utils/throwError.js";

class BranchSettingsService extends BaseService {
  constructor() {
    super(BranchSettingsModel, {
      brandScoped: true,
      softDelete: true,
      defaultPopulate: ["brand", "branch", "createdBy", "updatedBy"],
      defaultSort: { createdAt: -1 },
    });
  }

  // =====================================================
  // 🔹 CREATE (Prevent duplicate per branch)
  // =====================================================
  async create({ brandId, data, createdBy }) {
    const exists = await this.model.findOne({
      branch: data.branch,
      isDeleted: false,
    });

    if (exists) {
      throw throwError("Settings already exist for this branch", 400);
    }

    return super.create({
      brandId,
      data,
      createdBy,
    });
  }

  // =====================================================
  // 🔹 GET BY BRANCH (IMPORTANT FOR FRONT)
  // =====================================================
  async getByBranch({ branchId, brandId }) {
    return this.findOne({
      brandId,
      filter: { branch: branchId },
    });
  }

  // =====================================================
  // 🔹 UPSERT (🔥 مهم جداً للفرونت)
  // =====================================================
  async upsert({ brandId, branchId, data, userId }) {
    const existing = await this.model.findOne({
      brand: brandId,
      branch: branchId,
    });

    if (existing) {
      return this.update({
        id: existing._id,
        brandId,
        data,
        updatedBy: userId,
      });
    }

    return this.create({
      brandId,
      data: { ...data, branch: branchId },
      createdBy: userId,
    });
  }

  // =====================================================
  // 🔹 IS BRANCH OPEN
  // =====================================================
  async isBranchOpen({ branchId, brandId }) {
    const settings = await this.getByBranch({ branchId, brandId });

    const now = new Date();
    const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
    const currentTime = now.toTimeString().slice(0, 5);

    const today = settings.operatingHours.find(d => d.day === dayName);

    if (!today || today.status !== "open") return false;

    for (const period of today.periods) {
      if (this._isWithinTime(currentTime, period.openTime, period.closeTime)) {
        const inPause = period.pauses?.some(p =>
          this._isWithinTime(currentTime, p.from, p.to)
        );

        if (!inPause) return true;
      }
    }

    return false;
  }

  // =====================================================
  // 🔹 SERVICE AVAILABILITY
  // =====================================================
  async isServiceAvailable({ branchId, brandId, serviceType }) {
    const allowed = ["dineIn", "takeaway", "delivery"];

    if (!allowed.includes(serviceType)) {
      throw throwError("Invalid service type", 400);
    }

    const settings = await this.getByBranch({ branchId, brandId });

    const now = new Date();
    const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
    const currentTime = now.toTimeString().slice(0, 5);

    const today = settings.operatingHours.find(d => d.day === dayName);
    if (!today || today.status !== "open") return false;

    for (const period of today.periods) {
      const service = period.services?.[serviceType];

      if (!service?.enabled) continue;

      const open = service.openTime || period.openTime;
      const close = service.closeTime || period.closeTime;

      if (this._isWithinTime(currentTime, open, close)) {
        const inPause = period.pauses?.some(p =>
          this._isWithinTime(currentTime, p.from, p.to)
        );

        if (!inPause) return true;
      }
    }

    return false;
  }

  // =====================================================
  // 🔹 CURRENT PERIOD
  // =====================================================
  async getCurrentPeriod({ branchId, brandId }) {
    const settings = await this.getByBranch({ branchId, brandId });

    const now = new Date();
    const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
    const currentTime = now.toTimeString().slice(0, 5);

    const today = settings.operatingHours.find(d => d.day === dayName);
    if (!today) return null;

    return (
      today.periods.find(p =>
        this._isWithinTime(currentTime, p.openTime, p.closeTime)
      ) || null
    );
  }

  // =====================================================
  // 🔹 NEXT OPEN TIME (🔥 للفرونت)
  // =====================================================
  async getNextOpenTime({ branchId, brandId }) {
    const settings = await this.getByBranch({ branchId, brandId });

    const now = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(now.getDate() + i);

      const dayName = date.toLocaleDateString("en-US", { weekday: "long" });

      const day = settings.operatingHours.find(d => d.day === dayName);

      if (!day || day.status !== "open") continue;

      if (day.periods.length) {
        return {
          day: dayName,
          time: day.periods[0].openTime,
        };
      }
    }

    return null;
  }

  // =====================================================
  // 🔒 PRIVATE TIME CHECK
  // =====================================================
  _isWithinTime(current, start, end) {
    if (!start || !end) return false;

    if (start <= end) {
      return current >= start && current <= end;
    }

    return current >= start || current <= end;
  }
}

export default new BranchSettingsService();