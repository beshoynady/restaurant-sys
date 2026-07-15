import PaymentChannelModel from "./payment-channel.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for payment-channel model
const paymentChannelService = new AdvancedService(PaymentChannelModel, {
  brandScoped: true,
  // No `isDeleted` field on this model — `enableSoftDelete: true` (previously via a
  // silently-ignored `softDelete: true` typo) filtered every read to nothing. Disabled.
  enableSoftDelete: false,
  defaultPopulate: ["brand","branch","clearingAccount","settlementAccount","feeAccount","createdBy","updatedBy"],
  searchableFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default paymentChannelService;
