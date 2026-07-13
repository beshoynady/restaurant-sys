// PLATFORM_FINAL_AUDIT.md PA-08 — reservation double-booking rejection.
// Verifies reservationService rejects a new reservation whose [startTime,endTime) window
// overlaps an existing pending/confirmed/seated reservation for the same table, while allowing
// a non-overlapping slot and a slot that overlaps only a cancelled reservation.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import {
  createBaseFixture,
  createDiningAreaFixture,
  createTableFixture,
  cleanupFixture,
  type TestFixture,
} from "./fixtures.js";
import reservationService from "../../modules/seating/reservation/reservation.service.js";
import ReservationModel from "../../modules/seating/reservation/reservation.model.js";

describe("PA-08: reservation double-booking rejection", () => {
  let fixture: TestFixture;
  let tableId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("reservation-overlap");
    const diningArea = await createDiningAreaFixture(fixture, "reservation-overlap");
    const table = await createTableFixture(fixture, String(diningArea._id), "reservation-overlap");
    tableId = String(table._id);
  });

  afterAll(async () => {
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("rejects a new reservation overlapping an existing pending reservation for the same table", async () => {
    const startTime = new Date(Date.UTC(2026, 0, 10, 18, 0));
    const endTime = new Date(Date.UTC(2026, 0, 10, 20, 0));

    await reservationService.create({
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      createdBy: fixture.userId,
      data: {
        branch: fixture.branchId,
        table: tableId,
        guestsCount: 2,
        reservationDate: startTime,
        startTime,
        endTime,
        createdBy: fixture.userId,
      },
    });

    const overlappingStart = new Date(Date.UTC(2026, 0, 10, 19, 0));
    const overlappingEnd = new Date(Date.UTC(2026, 0, 10, 21, 0));

    await expect(
      reservationService.create({
        brandId: fixture.brandId,
        branchId: fixture.branchId,
        createdBy: fixture.userId,
        data: {
          branch: fixture.branchId,
          table: tableId,
          guestsCount: 2,
          reservationDate: overlappingStart,
          startTime: overlappingStart,
          endTime: overlappingEnd,
          createdBy: fixture.userId,
        },
      }),
    ).rejects.toThrow(/already reserved/i);

    const count = await ReservationModel.countDocuments({ brand: fixture.brandId, table: tableId });
    expect(count).toBe(1);
  });

  it("allows a non-overlapping reservation for the same table", async () => {
    const startTime = new Date(Date.UTC(2026, 0, 11, 12, 0));
    const endTime = new Date(Date.UTC(2026, 0, 11, 13, 0));

    const reservation = await reservationService.create({
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      createdBy: fixture.userId,
      data: {
        branch: fixture.branchId,
        table: tableId,
        guestsCount: 2,
        reservationDate: startTime,
        startTime,
        endTime,
        createdBy: fixture.userId,
      },
    });

    expect(reservation).toBeTruthy();
  });

  it("allows a new reservation overlapping only a cancelled reservation", async () => {
    const startTime = new Date(Date.UTC(2026, 0, 12, 18, 0));
    const endTime = new Date(Date.UTC(2026, 0, 12, 20, 0));

    const cancelled = await reservationService.create({
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      createdBy: fixture.userId,
      data: {
        branch: fixture.branchId,
        table: tableId,
        guestsCount: 2,
        reservationDate: startTime,
        startTime,
        endTime,
        createdBy: fixture.userId,
      },
    });

    await ReservationModel.updateOne({ _id: cancelled._id }, { $set: { status: "cancelled" } });

    const overlapping = await reservationService.create({
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      createdBy: fixture.userId,
      data: {
        branch: fixture.branchId,
        table: tableId,
        guestsCount: 2,
        reservationDate: startTime,
        startTime,
        endTime,
        createdBy: fixture.userId,
      },
    });

    expect(overlapping).toBeTruthy();
  });
});
