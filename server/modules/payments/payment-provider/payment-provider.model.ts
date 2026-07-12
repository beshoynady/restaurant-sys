// DB-020 (DATABASE_IMPLEMENTATION_PLAN.md, Phase 0 / Epic 4): this file was
// previously 0 bytes. `payment-provider.service.js` imports it as the
// default export and calls `PaymentProviderModel.create/find/findById/
// findByIdAndUpdate/findByIdAndDelete`; `payment-provider.validation.js`
// reads `PaymentProviderModel.schema` at module-evaluation time (not inside
// a function), so the moment this vertical's router is ever mounted, the
// app would fail at import time, not just at first request. The router
// (`payment-provider.router.js`) is not currently mounted anywhere in
// server.ts, and its own import of
// `./paymentProvider/payment-provider.controller.js` points at a
// non-existent nested folder — a separate, pre-existing router-layer bug,
// out of scope here since this phase only touches the database layer.
//
// This is a minimal, non-speculative stub: standard brand-scoped identity
// + audit fields matching every other Tier-1 model's shape in this
// codebase (see stock-category.model.js), not the fuller
// gateway-credential/webhook design discussed in
// DATABASE_ARCHITECTURE_REDESIGN.md — that is future scope, not part of
// DB-020.
import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IPaymentProvider extends Document {
  brand: mongoose.Types.ObjectId;
  name: string;
  code: string;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: mongoose.Types.ObjectId | null;
  createdBy: mongoose.Types.ObjectId | null;
  updatedBy: mongoose.Types.ObjectId | null;
}

const paymentProviderSchema = new Schema<IPaymentProvider>(
  {
    brand: { type: Schema.Types.ObjectId, ref: "Brand", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    code: { type: String, required: true, trim: true, uppercase: true, maxlength: 30 },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "UserAccount", default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "UserAccount", default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true },
);

paymentProviderSchema.index({ brand: 1, code: 1 }, { unique: true });

const PaymentProviderModel: Model<IPaymentProvider> =
  mongoose.models.PaymentProvider || mongoose.model<IPaymentProvider>("PaymentProvider", paymentProviderSchema);

export default PaymentProviderModel;
