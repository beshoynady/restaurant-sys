// DATABASE_IMPLEMENTATION_PLAN.md DB-007: atomic, branch-scoped invoice-serial generation.
import BaseRepository from "../../../utils/BaseRepository.js";
import throwErrorJs from "../../../utils/throwError.js";
import InvoiceSettingsModel, {
  type IInvoiceSettings,
  type InvoiceDateComponent,
} from "./invoice-settings.model.js";

const throwError = throwErrorJs as (message: string, statusCode: number) => never;

function pad(num: number, width: number): string {
  return String(num).padStart(width, "0");
}

function buildDateComponent(includeDate: InvoiceDateComponent, date: Date): string {
  const day = pad(date.getUTCDate(), 2);
  const month = pad(date.getUTCMonth() + 1, 2);
  const year = String(date.getUTCFullYear());

  switch (includeDate) {
    case "DD":
      return day;
    case "MM":
      return month;
    case "YYYY":
      return year;
    case "YYYYMMDD":
      return `${year}${month}${day}`;
    case "NONE":
    default:
      return "";
  }
}

/** The start of the reset period this policy resets on, or `null` if it never resets ("NONE"). */
function currentPeriodStart(resetPolicy: string, date: Date): Date | null {
  if (resetPolicy === "MONTHLY") {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  }
  if (resetPolicy === "YEARLY") {
    return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  }
  return null;
}

class InvoiceSettingsService extends BaseRepository<IInvoiceSettings> {
  constructor() {
    super(InvoiceSettingsModel, {
      brandScoped: true,
      branchScoped: true,
      enableSoftDelete: true,
      defaultPopulate: ["brand", "branch", "createdBy", "updatedBy"],
      defaultSort: { createdAt: -1 },
    });
  }

  /**
   * DB-007: atomic, branch-scoped, concurrency-safe invoice-serial generation.
   * Same two-step atomic pattern as OrderSettingsService.getNextOrderNumber
   * (see that method's comment for the concurrency-safety argument), extended
   * to respect this settings doc's configurable prefix/padding/date-component/
   * separator/resetPolicy rather than a fixed format.
   */
  async getNextInvoiceSerial(brandId: string, branchId: string): Promise<string> {
    const settings = await this.model
      .findOne({ brand: brandId, branch: branchId, isDeleted: false })
      .lean();

    if (!settings) {
      throwError(
        "No InvoiceSettings configured for this branch — cannot generate an invoice serial.",
        422,
      );
    }

    // Non-null: throwError() above throws synchronously and never returns — asserted rather than
    // relying on cross-boundary narrowing of the imported `.js` `never`-return type.
    const seq = settings!.invoiceSequence;
    const now = new Date();
    const periodStart = currentPeriodStart(seq.resetPolicy, now);

    if (periodStart) {
      const resetResult = await this.model.findOneAndUpdate(
        {
          brand: brandId,
          branch: branchId,
          $or: [
            { "invoiceSequence.lastResetDate": null },
            { "invoiceSequence.lastResetDate": { $exists: false } },
            { "invoiceSequence.lastResetDate": { $lt: periodStart } },
          ],
        },
        {
          $set: {
            "invoiceSequence.currentNumber": seq.startNumber + 1,
            "invoiceSequence.lastResetDate": periodStart,
          },
        },
        { new: false },
      );

      if (resetResult) {
        return this.format(seq, now, seq.startNumber);
      }
    }

    const incremented = await this.model.findOneAndUpdate(
      { brand: brandId, branch: branchId },
      { $inc: { "invoiceSequence.currentNumber": 1 } },
      { new: false }, // return the document as it was BEFORE this increment
    );

    if (!incremented) {
      throwError(
        "No InvoiceSettings configured for this branch — cannot generate an invoice serial.",
        422,
      );
    }

    const assignedNumber = incremented!.invoiceSequence?.currentNumber ?? seq.startNumber;
    return this.format(seq, now, assignedNumber);
  }

  private format(seq: IInvoiceSettings["invoiceSequence"], date: Date, num: number): string {
    const dateComponent = buildDateComponent(seq.includeDate, date);
    const paddedNumber = pad(num, seq.padding);
    const parts = [seq.prefix, dateComponent, paddedNumber].filter((part) => part.length > 0);
    return parts.join(seq.separator || "-");
  }
}

export default new InvoiceSettingsService();
