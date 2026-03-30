import SupplierModel from "../../models/purchasing/supplier.model.js";
import AdvancedService from "../../utils/AdvancedService.js";

// Initialize service for supplier model
const supplierService = new AdvancedService(SupplierModel, {
  brandScoped: true,
  softDelete: true,
  defaultPopulate: ["brand","branch","itemsSupplied","assetsSupplied","services","createdBy","updatedBy","deletedBy"],
  searchFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default supplierService;
