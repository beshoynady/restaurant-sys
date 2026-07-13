// DATABASE_IMPLEMENTATION_PLAN.md DB-007: wires the atomic invoice-serial generator into invoice
// creation via BaseRepository's `beforeCreate` hook. `invoice.model.js` intentionally left as `.js`
// (out of this task's scope) — typed against `BaseRepository<any>`, matching order.service.ts's
// documented rationale.
import BaseRepository from "../../../utils/BaseRepository.js";
import throwErrorJs from "../../../utils/throwError.js";
import InvoiceModel from "./invoice.model.js";
import invoiceSettingsService from "../invoice-settings/invoice-settings.service.js";

const throwError = throwErrorJs as (message: string, statusCode: number) => never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
class InvoiceService extends BaseRepository<any> {
  constructor() {
    super(InvoiceModel, {
      brandScoped: true,
      // PLATFORM_FINAL_AUDIT.md PA-03, corrected: Invoice is a transactional
      // fiscal document with its own status lifecycle (OPEN/PAID/
      // PARTIALLY_RETURNED/FULLY_RETURNED/CANCELLED) — soft-delete is not
      // the right model for it (see order.service.ts).
      enableSoftDelete: false,
      defaultPopulate: ["brand", "branch", "cashierShift", "cashier", "deliveryMan", "order", "paidBy"],
      searchableFields: [],
      defaultSort: { createdAt: -1 },
    });
  }

  // DB-007: server-generates `serial` instead of trusting a client-supplied value — makes the
  // {brand,branch,serial} unique index (DB-003) collision-free in practice. `invoice.validation.js`
  // now excludes `serial` from client input (stripped, not rejected — old clients stay compatible).
  async beforeCreate(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const brandId = data.brand as string | undefined;
    const branchId = data.branch as string | undefined;

    if (!brandId || !branchId) {
      throwError("brand and branch are required to generate an invoice serial.", 400);
    }

    const serial = await invoiceSettingsService.getNextInvoiceSerial(brandId!, branchId!);

    return { ...data, serial };
  }
}

export default new InvoiceService();
