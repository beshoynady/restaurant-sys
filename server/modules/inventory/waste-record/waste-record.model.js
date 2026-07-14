import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema.Types;

/**
 * WasteRecord — Preparation & Kitchen Operations Platform, Phase 1.
 *
 * Covers every waste scenario named for this platform (preparation waste, production waste,
 * cooking loss, yield loss, spoilage, expiry, damage, burned food, shrinkage, theft, quality
 * reject, customer-return waste) as ONE transactional document with a `wasteCategory` reason
 * code — deliberately not eleven separate models, matching this platform's consistent "one
 * mechanism, categorized by a reason field" discipline already applied to ManualConsumption's
 * `reasonCategory`.
 *
 * Reuses the existing Inventory Posting Engine (`warehouseDocumentService.postDocument`, the
 * already-real "Wastage" transactionType) and Journal Entry Posting Engine exactly as
 * ManualConsumption does — no new posting mechanism, no new control account (routes to the
 * existing `controlAccounts.inventoryAdjustment`, the same account InventoryCount's shrinkage
 * posting already uses for an unplanned inventory loss).
 */
const wasteRecordSchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", required: true },

    wasteNumber: { type: String, trim: true, maxlength: 100, required: true },
    wasteDate: { type: Date, default: Date.now },

    // Source location — the warehouse/operational inventory the wasted stock is deducted from.
    warehouse: { type: ObjectId, ref: "Warehouse", required: true },

    wasteCategory: {
      type: String,
      enum: [
        "PreparationWaste", "ProductionWaste", "CookingLoss", "YieldLoss", "Spoilage",
        "Expired", "Damaged", "BurnedFood", "Shrinkage", "Theft", "QualityReject",
        "CustomerReturnWaste",
      ],
      required: true,
    },

    items: [
      {
        stockItem: { type: ObjectId, ref: "StockItem", required: true },
        quantity: { type: Number, required: true, min: 0.0001 },
        unitCost: { type: Number, default: 0, min: 0 }, // resolved at posting time via the Cost Engine, never client-supplied
        totalCost: { type: Number, default: 0, min: 0 },
      },
    ],

    // Department (or a specific child station — both are PreparationSectionConfig documents,
    // same single-reference convention already used by Product.preparationSection/
    // ProductionOrder.preparationSection) where the waste occurred.
    department: { type: ObjectId, ref: "PreparationSectionConfig", required: true },
    shift: { type: ObjectId, ref: "Shift", default: null },

    // Employee Responsibility — who is responsible for this waste event (not necessarily who
    // recorded it, same distinction already drawn on ManualConsumption.consumedBy vs. createdBy).
    responsibleEmployee: { type: ObjectId, ref: "Employee", default: null },

    reasonNotes: { type: String, trim: true, maxlength: 500 },
    // Photos/Documents — URLs only (upload/storage is an infrastructure concern outside this
    // platform's backend-architecture scope, same boundary already drawn for ProductReview's
    // photo field).
    photos: [{ type: String, trim: true }],

    totalCost: { type: Number, default: 0, min: 0 }, // Cost Impact

    status: {
      type: String,
      enum: ["Draft", "Submitted", "Approved", "Rejected", "Cancelled"],
      default: "Draft",
    },

    approvedBy: { type: ObjectId, ref: "UserAccount", default: null },
    approvedAt: { type: Date, default: null },
    rejectedBy: { type: ObjectId, ref: "UserAccount", default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, maxlength: 300, default: null },

    // Accounting Impact / Audit Trail — set only once Approved (approving IS posting, same
    // convention as ManualConsumption/GoodsReceiptNote).
    warehouseDocument: { type: ObjectId, ref: "WarehouseDocument", default: null },
    journalEntry: { type: ObjectId, ref: "JournalEntry", default: null },
    accountingPosted: { type: Boolean, default: false },

    createdBy: { type: ObjectId, ref: "UserAccount", required: true },
    updatedBy: { type: ObjectId, ref: "UserAccount", default: null },
  },
  { timestamps: true },
);

wasteRecordSchema.index({ brand: 1, branch: 1, wasteNumber: 1 }, { unique: true });

export default mongoose.model("WasteRecord", wasteRecordSchema);
