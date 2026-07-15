import SupplierModel from "./supplier.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for supplier model
const supplierService = new AdvancedService(SupplierModel, {
  brandScoped: true,
  enableSoftDelete: true,
  defaultPopulate: ["brand","branch","itemsSupplied","assetsSupplied","services","createdBy","updatedBy","deletedBy"],
  searchableFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default supplierService;
