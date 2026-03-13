const purchaseInvoiceModel = require("../../models/purchase.model");

// Create a new purchase invoice
const createPurchaseInvoice = async (req, res) => {
  try {
    const {
      returnInvoice,
      invoiceNumber,
      invoiceDate,
      supplier,
      items,
      totalAmount,
      discount,
      netAmount,
      salesTax,
      paidAmount,
      balanceDue,
      paymentDueDate,
      additionalCost,
      cashRegister,
      paymentStatus,
      paymentType,
      paymentMethod,
      notes,
    } = req.body;

    // Assume that req.user contains the authenticated employee information
    const createdBy = req.user.id;

    // Check if required fields are missing
    if (
      !invoiceNumber ||
      !invoiceDate ||
      !supplier ||
      !items ||
      !totalAmount ||
      !netAmount ||
      !paymentStatus
    ) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const newPurchaseInvoice = await purchaseInvoiceModel.create({
      returnInvoice,
      invoiceNumber,
      invoiceDate,
      supplier,
      items,
      totalAmount,
      discount,
      netAmount,
      salesTax,
      additionalCost,
      paidAmount,
      balanceDue,
      paymentDueDate,
      cashRegister,
      paymentStatus,
      paymentType,
      paymentMethod,
      notes,
      createdBy,
    });

    res.status(201).json(newPurchaseInvoice);
  } catch (error) {
    res.status(500).json({ message: error.message, error });
  }
};

// Retrieve all purchase invoices
const getAllPurchaseInvoices = async (req, res) => {
  try {
    // Retrieve all purchase invoices and populate related fields
    const purchaseInvoices = await purchaseInvoiceModel
      .find()
      .populate("items.itemId") // Populate items.itemId field
      .populate("supplier") // Populate supplier field
      .populate("createdBy") // Populate createdBy field
      .populate("cashRegister"); // Populate cashRegister field

    // Check if there are no purchase invoices found
    if (!purchaseInvoices || purchaseInvoices.length === 0) {
      return res.status(200).json([]);
    }

    // If purchase invoices are found, send them as response
    res.status(200).json(purchaseInvoices);
  } catch (error) {
    // Handle any errors that occur during the process
    console.error("Error in getAllPurchaseInvoices:", error);
    res.status(500).json({ message: "Dine-in server error." });
  }
};

// Retrieve a single purchase invoice by ID
const getPurchaseInvoiceById = async (req, res) => {
  try {
    // Populate the supplier, items, and createdBy fields
    const purchaseInvoice = await purchaseInvoiceModel
      .findById(req.params.id)
      .populate("items.itemId") // Populate items.itemId field
      .populate("supplier", "_id name") // Populate supplier field
      .populate("createdBy", "_id fullname role") // Populate createdBy field
      .populate("cashRegister"); // Populate cashRegister field
    if (!purchaseInvoice) {
      return res.status(404).json({ message: "Purchase invoice not found" });
    }
    res.status(200).json(purchaseInvoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a purchase invoice by ID
const updatePurchaseInvoiceById = async (req, res) => {
  try {
    const updatedPurchaseInvoice = await purchaseInvoiceModel.findByIdAndUpdate(
      req.params.id,
      {$set: req.body},
      { new: true }
    );
    if (!updatedPurchaseInvoice) {
      return res.status(404).json({ message: "Purchase invoice not found" });
    }
    res.status(200).json(updatedPurchaseInvoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a purchase invoice by ID
const deletePurchaseInvoiceById = async (req, res) => {
  try {
    const deletedPurchaseInvoice = await purchaseInvoiceModel.findByIdAndDelete(
      req.params.id
    );
    if (!deletedPurchaseInvoice) {
      return res.status(404).json({ message: "Purchase invoice not found" });
    }
    res.status(200).json({ message: "Purchase invoice deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createPurchaseInvoice,
  getAllPurchaseInvoices,
  getPurchaseInvoiceById,
  updatePurchaseInvoiceById,
  deletePurchaseInvoiceById,
};
