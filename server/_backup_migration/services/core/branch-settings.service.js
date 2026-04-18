// services/core/branch-settings.service.js

import AdvancedService from "../../utils/AdvancedService.js";
import BranchSettingsModel from "../../models/core/branch-settings.model.js";
import throwError from "../../utils/throwError.js";

/**
 * BranchSettingsService
 * -------------------------------------------------------
 * Handles:
 * - CRUD (via AdvancedService)
 * - Branch availability logic
 * - Service availability
 * - Time-based calculations
 */
class BranchSettingsService extends AdvancedService {
  constructor() {
    super(BranchSettingsModel, {
      brandScoped: true,
      softDelete: true,
      defaultPopulate: ["brand", "branch", "createdBy", "updatedBy", "deletedBy"],
      searchFields: [],
      defaultSort: { createdAt: -1 },
    });
  }

  // =====================================================
  // 🔹 GET SETTINGS BY BRANCH
  // =====================================================
  async getByBranch(branchId) {
    const settings = await this.findOne({
      filter: { branch: branchId },
    });

    if (!settings) {
      throw throwError("Branch settings not found", 404);
    }

    return settings;
  }

  // =====================================================
  // 🔹 CHECK IF BRANCH IS OPEN
  // =====================================================
  async isBranchOpen(branchId) {
    const settings = await this.getByBranch(branchId);

    const now = new Date();
    const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
    const currentTime = now.toTimeString().slice(0, 5);

    const today = settings.operatingHours.find(d => d.day === dayName);

    if (!today || today.status !== "open") return false;

    for (const period of today.periods) {
      if (this.#isWithinTime(currentTime, period.openTime, period.closeTime)) {

        const inPause = period.pauses?.some(p =>
          this.#isWithinTime(currentTime, p.from, p.to)
        );

        if (!inPause) return true;
      }
    }

    return false;
  }

  // =====================================================
  // 🔹 CHECK SERVICE AVAILABILITY
  // =====================================================
  async isServiceAvailable(branchId, serviceType) {
    const allowed = ["dineIn", "takeaway", "delivery"];

    if (!allowed.includes(serviceType)) {
      throw throwError("Invalid service type", 400);
    }

    const settings = await this.getByBranch(branchId);

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

      if (this.#isWithinTime(currentTime, open, close)) {
        const inPause = period.pauses?.some(p =>
          this.#isWithinTime(currentTime, p.from, p.to)
        );

        if (!inPause) return true;
      }
    }

    return false;
  }

  // =====================================================
  // 🔹 GET CURRENT ACTIVE PERIOD
  // =====================================================
  async getCurrentPeriod(branchId) {
    const settings = await this.getByBranch(branchId);

    const now = new Date();
    const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
    const currentTime = now.toTimeString().slice(0, 5);

    const today = settings.operatingHours.find(d => d.day === dayName);
    if (!today) return null;

    return (
      today.periods.find(p =>
        this.#isWithinTime(currentTime, p.openTime, p.closeTime)
      ) || null
    );
  }

  // =====================================================
  // 🔒 PRIVATE: TIME CHECK (SUPPORTS MIDNIGHT)
  // =====================================================
  #isWithinTime(current, start, end) {
    if (!start || !end) return false;

    // normal case
    if (start <= end) {
      return current >= start && current <= end;
    }

    // overnight case (e.g. 18:00 → 02:00)
    return current >= start || current <= end;
  }
}

export default new BranchSettingsService();