import DiningAreaModel from "./dining-area.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";

// Initialize service for dining-area model
const diningAreaService = new AdvancedService(DiningAreaModel, {
  brandScoped: true,
  // `DiningArea` has no `isDeleted` field in its schema — same empty-reads defect
  // as `Table` (see its service file for the full explanation). Disabled explicitly.
  enableSoftDelete: false,
  defaultPopulate: ["brand","branch","createdBy","updatedBy"],
  searchableFields: [], // specify searchable fields if needed
  defaultSort: { createdAt: -1 },
});

export default diningAreaService;
