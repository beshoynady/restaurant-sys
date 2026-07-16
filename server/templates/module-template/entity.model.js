// <Entity> Model
// -----------------------------------------------------------------------------
// TEMPLATE — see ERP_DEVELOPMENT_STANDARD.md §1 (Model Standards) before filling this in.
// Delete every comment starting with "TEMPLATE:" once you've made the corresponding decision.
import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

const entitySchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },

    // TEMPLATE: pick ONE of the two branch patterns below and delete the other.
    // Pattern A — this document inherently belongs to one branch (most transactional documents):
    branch: { type: ObjectId, ref: "Branch", required: true },
    // Pattern B — branch is an OPTIONAL override of a brand-wide default (null = brand-wide), e.g.
    // a chart-of-accounts-style entity. null means brand-wide, not "unscoped" — see
    // financial-statements.service.js#_accountFilter() for the read-side $or:[{branch:null},{branch}]
    // pattern this implies:
    // branch: { type: ObjectId, ref: "Branch", default: null },

    name: {
      type: Map,
      of: { type: String, trim: true, minlength: 2, maxlength: 100 },
      required: true,
    },

    // TEMPLATE: any globally-unique-looking field (code/slug/number) MUST be brand-scoped in its
    // index below ({brand, code}, unique) — never {code} alone.
    // code: { type: String, required: true, trim: true, uppercase: true },

    // TEMPLATE: lifecycle status — define the full enum up front, and build a matching
    // createTransitionGuard({...}) table in entity.service.js before writing any transition method.
    status: {
      type: String,
      enum: ["Draft", "Active", "Cancelled"],
      default: "Draft",
    },

    // TEMPLATE: derived field example — compute this in entity.service.js#beforeCreate, never in a
    // schema default, and add it to lockedUpdateFields in entity.repository.js/entity.service.js so
    // a generic PUT can never overwrite it post-creation.
    // computedTotal: { type: Number, default: 0, min: 0 },

    // TEMPLATE: audit-trail fields for anything with an approval workflow — add only the ones this
    // entity actually needs.
    // submittedBy: { type: ObjectId, ref: "UserAccount", default: null },
    // submittedAt: { type: Date, default: null },
    // approvedBy: { type: ObjectId, ref: "UserAccount", default: null },
    // approvedAt: { type: Date, default: null },
    // rejectedBy: { type: ObjectId, ref: "UserAccount", default: null },
    // rejectedAt: { type: Date, default: null },
    // rejectionReason: { type: String, trim: true, maxlength: 300, default: null },

    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },

    // TEMPLATE: soft-delete fields — only if this is master/config data, not a transactional
    // document with its own explicit lifecycle status (see ERP_DEVELOPMENT_STANDARD.md §2,
    // "Soft delete policy"). Delete these three fields entirely if this entity uses status instead.
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true },
);

// TEMPLATE: the tenant-scoping compound index matching this entity's dominant query shape.
entitySchema.index({ brand: 1, branch: 1, status: 1 });
// TEMPLATE: uncomment + adjust if this entity has a brand-scoped unique code/number.
// entitySchema.index({ brand: 1, code: 1 }, { unique: true });

const EntityModel = mongoose.models.Entity || mongoose.model("Entity", entitySchema);
export default EntityModel;
