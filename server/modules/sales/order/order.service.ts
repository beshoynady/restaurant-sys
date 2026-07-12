// DATABASE_IMPLEMENTATION_PLAN.md DB-007: wires the atomic order-number generator into order
// creation via BaseRepository's existing `beforeCreate` lifecycle hook — the minimal, idiomatic
// extension point already provided for exactly this purpose, rather than overriding `create()`
// wholesale. `order.model.js` is intentionally left as-is (untouched, still `.js`) — converting it
// to TypeScript is outside this task's scope (DB-007/010/014 only); this service is typed against
// `BaseRepository<any>`, the same documented widening `BaseController.d.ts` already uses for the
// identical reason (Mongoose `Model<T>` invariance would otherwise reject a concrete document type
// without the source model itself also being TypeScript).
import BaseRepository from "../../../utils/BaseRepository.js";
import throwErrorJs from "../../../utils/throwError.js";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import OrderModel from "./order.model.js";
import orderSettingsService from "../order-settings/order-settings.service.js";

const throwError = throwErrorJs as (message: string, statusCode: number) => never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
class OrderService extends BaseRepository<any> {
  constructor() {
    super(OrderModel, {
      brandScoped: true,
      // Corrected key name while this file was already being converted: `softDelete` is not a
      // recognized BaseRepositoryOptions field (the correct name is `enableSoftDelete`, default
      // `true`) — the original was already silently a no-op, not a behavior change here.
      enableSoftDelete: true,
      // DB-016 minimal compatibility update (retained): "user" removed (field no longer exists —
      // Order.customer is now a single polymorphic reference, see order.model.js).
      defaultPopulate: ["brand", "branch", "cashierShift", "staffMember", "table", "orderBy", "customer"],
      searchableFields: [],
      defaultSort: { createdAt: -1 },
    });
  }

  // DB-007: server-generates `orderNum` instead of trusting a client-supplied value — this is what
  // actually makes the {brand,branch,orderNum} unique index (DB-003) collision-free in practice,
  // not just structurally possible. `order.validation.js`'s create schema now excludes `orderNum`
  // from client input (stripped, not rejected, so old clients that still send one stay compatible).
  async beforeCreate(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const brandId = data.brand as string | undefined;
    const branchId = data.branch as string | undefined;

    if (!brandId || !branchId) {
      throwError("brand and branch are required to generate an order number.", 400);
    }

    const orderNum = await orderSettingsService.getNextOrderNumber(brandId!, branchId!);

    return { ...data, orderNum };
  }
}

export default new OrderService();
