import mongoose from "mongoose";

const { Schema } = mongoose;

const { ObjectId } = mongoose.Schema.Types;

/**
 * Employee Core Model
 * Contains personal info and employment-related data.
 * Serves as the HR core entity.
 */
const employeeSchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    // Branch Access Control
    branches: {
      type: [{ type: ObjectId, ref: "Branch" }],
      required: true,
    },
    // Default working branch (used in login/session)
    defaultBranch: {
      type: ObjectId,
      ref: "Branch",
      required: true,
    },

    // Personal Information
    firstName: {
      type: Map,
      of: {
        type: String,
        trim: true,
        minlength: 2,
        maxlength: 100,
      },
      required: true,
    },

    // Not required — many cultures/naming conventions have no middle name;
    // a hard requirement here blocked creating a real, valid employee.
    middleName: {
      type: Map,
      of: {
        type: String,
        trim: true,
        minlength: 2,
        maxlength: 100,
      },
    },

    lastName: {
      type: Map,
      of: {
        type: String,
        trim: true,
        minlength: 2,
        maxlength: 100,
      },
      required: true,
    },

    gender: { type: String, enum: ["male", "female"], required: true },
    // Minimum-age floor (14) is a general sanity check, not a specific
    // country's labor-law minimum working age — real jurisdictional rules
    // belong in employee-settings once that policy surface exists.
    dateOfBirth: {
      type: Date,
      required: true,
      validate: {
        validator(value) {
          const minAgeDate = new Date();
          minAgeDate.setFullYear(minAgeDate.getFullYear() - 14);
          return value <= minAgeDate;
        },
        message: "Employee must be at least 14 years old",
      },
    },
    nationalID: {
      type: String,
      trim: true,
      required: true,
      minlength: 10,
      maxlength: 30,
    },

    nationality: {
      type: String,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    // Marital status is important for benefits and tax purposes
    maritalStatus: {
      type: String,
      enum: ["single", "married", "divorced", "widowed"],
    },

    profileImage: { type: String, default: "" },

    defaultLanguage: {
      type: String,
      uppercase: true,
      minlength: 2,
      maxlength: 2,
      default: "EN",
    },

    /*  
     Contact Details
      - Phone is required and unique for direct communication.
      - WhatsApp is optional for messaging.
      - Email is optional but must be valid if provided.
      - Address is optional but can store detailed location info.
    */
    phone: {
      type: String,
      minlength: 7,
      maxlength: 20,
      trim: true,
      required: true,
    },
    emergencyContact: [
      {
        name: {
          type: String,
          trim: true,
          maxlength: 100,
        },
        phone: {
          type: String,
          minlength: 7,
          maxlength: 20,
          trim: true,
        },
        relation: {
          type: String,
          trim: true,
          maxlength: 100,
        },
      },
    ],

    whatsapp: {
      type: String,
      minlength: 7,
      maxlength: 20,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: /\S+@\S+\.\S+/,
    },

    address: {
      type: Map,
      of: {
        type: new Schema({
          country: { type: String, required: true, trim: true, maxlength: 100 },
          stateOrProvince: { type: String, trim: true, maxlength: 100 },
          city: { type: String, required: true, trim: true, maxlength: 100 },
          area: { type: String, trim: true, maxlength: 100 },
          street: { type: String, trim: true, maxlength: 150 },
          buildingNumber: { type: String, trim: true, maxlength: 20 },
          floor: { type: String, trim: true, maxlength: 10 },
          landmark: { type: String, trim: true, maxlength: 150 },
        }),
      },
    },

    // Employment Information
    employeeCode: {
      type: String,
      trim: true,
      required: true,
      uppercase: true,
      minlength: 3,
      maxlength: 20,
    },
    // For better HR management and reporting, we track employment details directly in the Employee model.
    department: { type: ObjectId, ref: "Department", required: true },
    jobTitle: { type: ObjectId, ref: "JobTitle", required: true },
    // Org-chart reporting line — previously absent, no way to represent
    // "who does this employee report to."
    reportsTo: { type: ObjectId, ref: "Employee", default: null },
    hireDate: { type: Date, default: Date.now },
    contractType: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "permanent",
    },
    shift: {
      type: ObjectId,
      ref: "Shift",
      default: null,
    },
    // IAP V2.0 Milestone 4: the terminal/device this employee is expected to log in from, set by
    // the Owner/Manager (not self-service) — checked by AuthenticationSettings.requireAssignedDevice.
    // null means "no assignment configured," which the policy check treats as a mismatch when the
    // gate is on, not an automatic pass.
    assignedDevice: {
      type: ObjectId,
      ref: "Device",
      default: null,
    },
    workMode: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "on-site",
    },

    dailyWorkingHours: { type: Number, min: 1, max: 24, default: 8 },

    weeklyOffDay: {
      type: [String],
      default: [],
    },

    // Leave-policy defaults, copied at creation time from
    // EmployeeSettings.leavePolicy (brand-wide policy) — these are NOT
    // automatically kept in sync if brand policy changes later; that's
    // intentional once `usesCustomLeavePolicy` is explicitly set, but
    // silent for employees who never opted out of the default. Until an
    // employee-settings-resolution service exists (employee-settings is
    // module 8 of this rollout), callers should treat non-overridden
    // values here as a point-in-time snapshot, not a live policy link.
    usesCustomLeavePolicy: { type: Boolean, default: false },
    annualLeaveDays: { type: Number, min: 0, max: 365, default: 21 },
    emergencyLeaveDays: { type: Number, min: 0, max: 30, default: 3 },
    sickLeaveDays: { type: Number, min: 0, max: 365, default: 7 },

    documents: [
      {
        name: {
          type: Map,
          of: {
            type: String,
            trim: true,
            minlength: 2,
            maxlength: 100,
          },
          required: true,
        },
        documentType: {
          type: Map,
          of: {
            type: String,
            trim: true,
            minlength: 2,
            maxlength: 100,
          },
          required: true,
        },
        fileUrl: {
          type: String,
          trim: true,
          required: true,
          maxlength: 300,
        },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    hasAccount: { type: Boolean, default: false }, // Flag to indicate if a user account has been created for this employee
    // Status & Roles
    isVerified: { type: Boolean, default: false },
    isOwner: { type: Boolean, default: false },

    // Employment status tracking for better HR management and reporting
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
    createdBy: { type: ObjectId, ref: "UserAccount", default: null },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true, versionKey: false },
);

// Indexes
employeeSchema.index({ brand: 1, branches: 1 });
employeeSchema.index({ brand: 1, department: 1 });
employeeSchema.index({ brand: 1, jobTitle: 1 });
employeeSchema.index({ employeeCode: 1, brand: 1 }, { unique: true });
employeeSchema.index({ nationalID: 1, brand: 1 }, { unique: true });
employeeSchema.index({ phone: 1, brand: 1 }, { unique: true });
// Status is a common admin/dashboard list filter (e.g. "active employees").
employeeSchema.index({ brand: 1, status: 1 });
employeeSchema.index({ reportsTo: 1 });

// model definition
const Employee = mongoose.model("Employee", employeeSchema);
export default Employee;
