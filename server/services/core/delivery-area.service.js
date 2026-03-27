import DeliveryAreaModel from "../../models/core/delivery-area.model.js";
import AdvancedCrudService from "../AdvancedCrudService.js";

// Initialize service for delivery-area model
const deliveryAreaService = new AdvancedCrudService(DeliveryAreaModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default deliveryAreaService;
