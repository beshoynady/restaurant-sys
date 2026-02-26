const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const WEEK_DAYS = [
  "saturday",
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
];

/**
 * Employee Core Model
 * Contains personal info and employment-related data.
 * Serves as the HR core entity.
 */
const employeeSchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", default: null },
    type: { type: String, enum: ["staff", "system_user"], default: "staff" },

    // Personal Information
    fullName: { type: Map, of: String, required: true }, // { en: "John Doe", ar: "جون دو" }
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    dateOfBirth: { type: Date },
    nationalID: {
      type: String,
      trim: true,
      required: true,
      unique: true,
      minlength: 10,
      maxlength: 30,
    },
    nationality: { type: String, trim: true, maxlength: 50 },
    maritalStatus: {
      type: String,
      enum: ["single", "married", "divorced", "widowed"],
    },
    profileImage: { type: String, default: "" },
    defaultLanguage: {
      type: String,
      enum: ["en", "ar", "fr", "es", "de", "zh", "hi"],
      default: "en",
    },

    /*  
     Contact Details
      - Phone is required and unique for direct communication.
      - WhatsApp is optional for messaging.
      - Email is optional but must be valid if provided.
      - Address is optional but can store detailed location info.
    */
    phone: { type: String, trim: true, required: true, unique: true },
    whatsapp: { type: String, trim: true },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/\S+@\S+\.\S+/, "Invalid email address"],
    },
    address: {
      country: { type: String, trim: true, maxlength: 100 },
      city: { type: String, trim: true, maxlength: 100 },
      area: { type: String, trim: true, maxlength: 100 },
      street: { type: String, trim: true, maxlength: 150 },
      building: { type: String, trim: true, maxlength: 20 },
      floor: { type: String, trim: true, maxlength: 10 },
      landmark: { type: String, trim: true, maxlength: 150 },
      fullAddress: { type: String, trim: true, maxlength: 300 },
    },

    // Employment Info
    employeeCode: {
      type: String,
      trim: true,
      required: true,
      uppercase: true,
      minlength: 3,
      maxlength: 20,
    },
    department: { type: ObjectId, ref: "Department" },
    jobTitle: { type: ObjectId, ref: "JobTitle" },
    hireDate: { type: Date, default: Date.now },
    contractType: {
      type: String,
      enum: ["permanent", "temporary", "part-time", "internship"],
      default: "permanent",
    },
    shift: { type: ObjectId, ref: "Shift", default: null },
    workMode: {
      type: String,
      enum: ["on-site", "remote", "hybrid"],
      default: "on-site",
    },

    dailyWorkingHours: { type: Number, min: 1, max: 24, default: 8 },
    weeklyOffDay: { type: String, enum: WEEK_DAYS, default: "friday" },
    annualLeaveDays: { type: Number, min: 0, max: 365, default: 21 },
    documents: [
  {
    name: {
        type: String,
        trim: true,
        maxlength: 100,
      },
      documentType: {
        type: String,
        enum: ["id_card", "passport", "contract", "other"],
      },
      fileUrl: {
        type: String,
        trim: true,
        maxlength: 300,
      },
      uploadedAt: { type: Date, default: Date.now },
    }
    ],

    // Status & Roles
    isVerified: { type: Boolean, default: false },
    isOwner: { type: Boolean, default: false },
    terminationDate: { type: Date, default: null },
    terminationReason: { type: String, trim: true, maxlength: 200 },
    status: {
      type: String,
      enum: [
        "active",
        "inactive",
        "terminated",
        "on_leave",
        "suspended",
        "resigned",
        "retired",
        "probation",
        "archived",
      ],
      default: "active",
    },

    // Metadata
    createdBy: { type: ObjectId, ref: "Employee", required: true },
    updatedBy: { type: ObjectId, ref: "Employee", default: null },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: ObjectId, ref: "Employee", default: null },
  },
  { timestamps: true, versionKey: false },
);

// Indexes
employeeSchema.index({ branch: 1 });
employeeSchema.index({ department: 1 });
employeeSchema.index({ jobTitle: 1 });
employeeSchema.index({ employeeCode: 1, brand: 1 }, { unique: true });
const Employee = mongoose.model("Employee", employeeSchema);
module.exports = Employee;
