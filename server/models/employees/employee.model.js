import mongoose from "mongoose";
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
    }, // { en: "John Doe", ar: "جون دو" }
    lastName: {
      type: Map,
      of: {
        type: String,
        trim: true,
        minlength: 2,
        maxlength: 100,
      },
      required: true,
    }, // { en: "John Doe", ar: "جون دو" }
    middleName: { type: Map, of: String }, // { en: "Michael", ar: "مايكل" }

    gender: { type: String, enum: ["male", "female"], required: true },
    dateOfBirth: { type: Date, required: true },
    nationalID: {
      type: String,
      trim: true,
      required: true,
      minlength: 10,
      maxlength: 30,
    },
    nationality: {
      type: Map,
      of: {
        type: String,
        trim: true,
        minlength: 2,
        maxlength: 100,
      },

      required: true,
    },
    maritalStatus: {
      type: String,
      enum: ["single", "married", "divorced", "widowed"],
    },
    profileImage: { type: String, default: "" },

    defaultLanguage: {
      type: String,
      enum: ["EN", "AR", "FR", "ES", "DE", "IT", "ZH", "JA", "RU"],
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
    emergencyContact: {
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
      match: [/\S+@\S+\.\S+/, "Invalid email address"],
    },
    address: {
      country: {
        type: Map,
        of: {
          type: String,
          trim: true,
          minlength: 2,
          maxlength: 100,
        },
        required: true,
      },
      city: {
        type: Map,
        of: {
          type: String,
          trim: true,
          minlength: 2,
          maxlength: 100,
        },
        required: true,
      },
      area: {
        type: Map,
        of: {
          type: String,
          trim: true,
          minlength: 2,
          maxlength: 100,
        },
        required: true,
      },
      street: {
        type: Map,
        of: {
          type: String,
          trim: true,
          minlength: 2,
          maxlength: 100,
        },
        required: true,
      },
      building: {
        type: Map,
        of: {
          type: String,
          trim: true,
          minlength: 2,
          maxlength: 100,
        },
        required: true,
      },
      floor: { type: Map, of: String },
      landmark: { type: Map, of: String }, //
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
    department: { type: ObjectId, ref: "Department", required: true },
    jobTitle: { type: ObjectId, ref: "JobTitle", required: true },
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
    weeklyOffDay: { type: [String], enum: WEEK_DAYS, default: ["friday"] },
    annualLeaveDays: { type: Number, min: 0, max: 365, default: 21 },
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
          type: String,
          required: true,
          enum: [
            "id_card",
            "passport",
            "contract",
            "certification",
            "insurance",
            "cv",
            "cover_letter",
            "other",
          ],
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
employeeSchema.index({ brand: 1, branch: 1 });
employeeSchema.index({ brand: 1, department: 1 });
employeeSchema.index({ brand: 1, jobTitle: 1 });
employeeSchema.index({ employeeCode: 1, brand: 1 }, { unique: true });
employeeSchema.index({ nationalID: 1, brand: 1 }, { unique: true });
employeeSchema.index({ phone: 1, brand: 1 }, { unique: true });

// model definition
const Employee = mongoose.model("Employee", employeeSchema);
export Employee;
