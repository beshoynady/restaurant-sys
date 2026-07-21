// Enterprise Operational Work Center fields — PREPARATION_SECTION_ENTERPRISE_WORK_CENTER_REVIEW.md
// §20. Purely additive (costCenter, operationalStatus, fallbackSection): no existing service reads
// these yet, so this only verifies the schema itself — defaults preserve current behavior for every
// pre-existing section, and the new references round-trip correctly.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, type TestFixture } from "./fixtures.js";
import PreparationSectionModel from "../../modules/preparation/preparation-section/preparation-section.model.js";
import CostCenterModel from "../../modules/accounting/cost-center/cost-center.model.js";

describe("PreparationSectionConfig: Enterprise Work Center fields", () => {
  let fixture: TestFixture;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("prep-sec-wc");
  });

  afterAll(async () => {
    await Promise.all([
      PreparationSectionModel.deleteMany({ brand: fixture.brandId }),
      CostCenterModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("defaults operationalStatus to OPEN and leaves costCenter/fallbackSection null — preserves existing sections' behavior", async () => {
    const section = await PreparationSectionModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Grill"]]),
      code: "GRILL-WC", description: new Map([["en", "test"]]), stationType: "grill",
      createdBy: fixture.userId,
    });

    expect(section.operationalStatus).toBe("OPEN");
    expect(section.costCenter).toBeNull();
    expect(section.fallbackSection).toBeNull();
  });

  it("persists a costCenter reference and an operationalStatus transition", async () => {
    const costCenter = await CostCenterModel.create({
      brand: fixture.brandId, name: new Map([["en", "Kitchen Ops"]]), code: "KITCHEN-WC",
      createdBy: fixture.userId,
    });

    const section = await PreparationSectionModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Bakery"]]),
      code: "BAKERY-WC", description: new Map([["en", "test"]]), stationType: "bakery",
      costCenter: costCenter._id, operationalStatus: "MAINTENANCE", createdBy: fixture.userId,
    });

    const reloaded = await PreparationSectionModel.findById(section._id).lean();
    expect(String(reloaded?.costCenter)).toBe(String(costCenter._id));
    expect(reloaded?.operationalStatus).toBe("MAINTENANCE");
  });

  it("supports a fallbackSection self-reference, same shape as parentDepartment", async () => {
    const primary = await PreparationSectionModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Main Grill"]]),
      code: "GRILL-MAIN-WC", description: new Map([["en", "test"]]), stationType: "grill",
      createdBy: fixture.userId,
    });
    const fallback = await PreparationSectionModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Backup Grill"]]),
      code: "GRILL-BACKUP-WC", description: new Map([["en", "test"]]), stationType: "grill",
      createdBy: fixture.userId, fallbackSection: primary._id,
    });

    const reloaded = await PreparationSectionModel.findById(fallback._id).lean();
    expect(String(reloaded?.fallbackSection)).toBe(String(primary._id));
  });

  it("rejects an invalid operationalStatus value", async () => {
    await expect(
      PreparationSectionModel.create({
        brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Bad"]]),
        code: "BAD-WC", description: new Map([["en", "test"]]), stationType: "grill",
        createdBy: fixture.userId, operationalStatus: "CLOSED_FOREVER",
      }),
    ).rejects.toThrow();
  });
});
