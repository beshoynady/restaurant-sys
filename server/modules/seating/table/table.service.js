import TableModel from "./table.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for table model
const tableService = new AdvancedService(TableModel, {
  brandScoped: true,
  // `Table` has no `isDeleted` field in its schema. With `enableSoftDelete: true`
  // (the previous, mistyped `softDelete: true` silently fell back to this same
  // default), BaseRepository.buildBaseQuery always adds `{isDeleted: false}` to
  // every query — which a document missing that field can never match, so every
  // read returned empty. Disabled explicitly, matching the same fix already
  // applied to Order/AccountBalance for the identical defect class.
  enableSoftDelete: false,
  defaultPopulate: ["brand","branch","diningArea","createdBy","updatedBy"],
  searchableFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default tableService;
