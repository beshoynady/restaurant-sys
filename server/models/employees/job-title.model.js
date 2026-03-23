import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

/**
 * JobTitle Model
 * Represents a specific job position within a restaurant department.
 * Supports multi-language (Arabic & English) fields.
 */
const jobTitleSchema = new mongoose.Schema(
  {
    brand: {
      type: ObjectId,
      ref: "Brand",
      required: [true, "Brand reference is required"],
    },
    branch: {
      type: ObjectId,
      ref: "Branch",
      default: null,
    },
    department: {
      type: ObjectId,
      ref: "Department",
      required: [true, "Department reference is required"],
    },
    name: {
      type: Map,
      of: {
        type: String,
        trim: true,
        maxlength: 100,
      },
      required: [true, "Job title name is required"],
    },
    description: {
      type: Map,
      of: {
        type: String,
        trim: true,
        maxlength: 300,
      },
    },
    responsibilities: {
      type: Map,
      of: {
        type: String,
        trim: true,
        maxlength: [1000, "Responsibilities can be max 1000 characters"],
      },
    },
    requirements: {
      type: Map,
      of: {
        type: String,
        trim: true,
        maxlength: [1000, "Requirements can be max 1000 characters"],
      },
    },
    status: {
      type: String,
      enum: ["pending", "active", "inactive", "archived", "draft", "suspended"],
      default: "active",
    },
    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true, versionKey: false },
);
jobTitleSchema.index({ "name.$**": 1 });
jobTitleSchema.index({ brand: 1, name: 1 });

const JobTitle = mongoose.model("JobTitle", jobTitleSchema);
export default JobTitle;
