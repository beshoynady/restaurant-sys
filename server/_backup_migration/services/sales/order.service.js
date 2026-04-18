import OrderModel from "../../models/sales/order.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for order model
const orderService = new AdvancedService(OrderModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","cashierShift","staffMember","table","orderBy","user","customer"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default orderService;
