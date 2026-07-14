import PaymentMethodModel from "./payment-method.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// V6.0 Production Hardening: `PaymentMethod` is a `required: true` reference on
// PurchaseInvoice.paymentMethod, PurchaseReturnInvoice.refundMethod, and
// SupplierTransaction.paymentMethod — the Supplier Payment/Refund workflow cannot function in a
// real deployment without a working, mounted API to create one (previously the router wasn't even
// importable, see payment-method.router.js's header comment). Fixed here: `softDelete`/
// `searchFields` are not recognized BaseRepository option names (the real ones are
// `enableSoftDelete`/`searchableFields`) — same silently-ignored typo already fixed on several
// other modules this engagement. This service already correctly extended AdvancedService, unlike
// StockCategoryService's hand-rolled class — only the option names were wrong.
const paymentMethodService = new AdvancedService(PaymentMethodModel, {
  brandScoped: true,
  enableSoftDelete: true,
  defaultPopulate: ["brand", "branch", "createdBy", "updatedBy", "deletedBy"],
  searchableFields: [],
  defaultSort: { createdAt: -1 },
});

export default paymentMethodService;
