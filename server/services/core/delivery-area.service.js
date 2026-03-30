import DeliveryAreaModel from "../../models/core/delivery-area.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for delivery-area model
const deliveryAreaService = new AdvancedService(DeliveryAreaModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default deliveryAreaService;
