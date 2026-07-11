import BaseService from "../../../utils/BaseService.js";
import throwErrorJs from "../../../utils/throwError.js";
import BranchSettingsModel, { type IBranchSettings, type ServiceType } from "./branch-settings.model.js";

const throwError = throwErrorJs as (message: string, statusCode: number) => never;

interface CreateInput {
  brandId: string;
  branchId: string;
  data: Record<string, unknown> & { branch: string };
  createdBy?: string | null;
}

interface UpsertInput {
  brandId: string;
  branchId: string;
  data: Record<string, unknown>;
  userId?: string | null;
}

interface BranchScopedInput {
  branchId: string;
  brandId?: string | null;
}

class BranchSettingsService extends BaseService<IBranchSettings> {
  constructor() {
    super(BranchSettingsModel, {
      brandScoped: true,
      branchScoped: true,
      enableSoftDelete: true,
      searchableFields: [],
      defaultPopulate: ["brand", "branch", "createdBy", "updatedBy"],
      defaultSort: { createdAt: -1 },
    });
  }

  // Prevent duplicate settings doc per branch.
  async create({ brandId, branchId, data, createdBy }: CreateInput): Promise<IBranchSettings> {
    const exists = await this.model.findOne({ branch: data.branch, isDeleted: false });
    if (exists) throwError("Settings already exist for this branch", 400);

    return super.create({ brandId, branchId, data, createdBy });
  }

  // BaseService has no `findOne` — this queries the model directly.
  async getByBranch({ branchId, brandId = null }: BranchScopedInput): Promise<IBranchSettings> {
    const query: Record<string, unknown> = { branch: branchId, isDeleted: false };
    if (brandId) query.brand = brandId;

    const settings = await this.model.findOne(query).populate(this.defaultPopulate).lean();
    if (!settings) throwError("Branch settings not found", 404);
    return settings as IBranchSettings;
  }

  // Upsert — important for the frontend settings screen.
  async upsert({ brandId, branchId, data, userId }: UpsertInput): Promise<IBranchSettings> {
    const existing = await this.model.findOne({ brand: brandId, branch: branchId });

    if (existing) {
      return this.update({
        id: existing._id,
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

  async isBranchOpen({ branchId, brandId = null }: BranchScopedInput): Promise<boolean> {
    const settings = await this.getByBranch({ branchId, brandId });

    const now = new Date();
    const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
    const currentTime = now.toTimeString().slice(0, 5);

    const today = settings.operatingHours.find((d) => d.day === dayName);
    if (!today || today.status !== "open") return false;

    for (const period of today.periods) {
      if (this.isWithinTime(currentTime, period.openTime, period.closeTime)) {
        const inPause = period.pauses?.some((p) => this.isWithinTime(currentTime, p.from, p.to));
        if (!inPause) return true;
      }
    }

    return false;
  }

  async isServiceAvailable({
    branchId,
    brandId = null,
    serviceType,
  }: BranchScopedInput & { serviceType: ServiceType }): Promise<boolean> {
    const allowed: ServiceType[] = ["dineIn", "takeaway", "delivery"];
    if (!allowed.includes(serviceType)) throwError("Invalid service type", 400);

    const settings = await this.getByBranch({ branchId, brandId });

    const now = new Date();
    const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
    const currentTime = now.toTimeString().slice(0, 5);

    const today = settings.operatingHours.find((d) => d.day === dayName);
    if (!today || today.status !== "open") return false;

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

  async getCurrentPeriod({ branchId, brandId = null }: BranchScopedInput) {
    const settings = await this.getByBranch({ branchId, brandId });

    const now = new Date();
    const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
    const currentTime = now.toTimeString().slice(0, 5);

    const today = settings.operatingHours.find((d) => d.day === dayName);
    if (!today) return null;

    return today.periods.find((p) => this.isWithinTime(currentTime, p.openTime, p.closeTime)) ?? null;
  }

  async getNextOpenTime({ branchId, brandId = null }: BranchScopedInput) {
    const settings = await this.getByBranch({ branchId, brandId });
    const now = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(now.getDate() + i);
      const dayName = date.toLocaleDateString("en-US", { weekday: "long" });

      const day = settings.operatingHours.find((d) => d.day === dayName);
      if (!day || day.status !== "open") continue;

      if (day.periods.length) {
        return { day: dayName, time: day.periods[0].openTime };
      }
    }

    return null;
  }

  private isWithinTime(current: string, start: string | null, end: string | null): boolean {
    if (!start || !end) return false;
    if (start <= end) return current >= start && current <= end;
    return current >= start || current <= end;
  }
}

export default new BranchSettingsService();
